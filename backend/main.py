from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import math
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import re

app = FastAPI(title="DAA Obfuscation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---

class AnalysisRequest(BaseModel):
    code: str
    language: str = "c"
    hex_data: Optional[str] = None

class EntropyRequest(BaseModel):
    data: str 
    window_size: int = 256

class AlignmentRequest(BaseModel):
    seq1: str
    seq2: str
    match: int = 1
    mismatch: int = -1
    gap: int = -2

# --- Helpers ---

def parse_code_to_cfg(code: str, language: str = "c"):
    lines = [line.strip() for line in code.split('\n') if line.strip()]
    nodes = []
    
    if language == "asm":
        # Advanced ASM Parser: Splits on Labels and Jumps
        current_block = {"id": "entry", "label": "Entry", "code": [], "next": []}
        nodes.append(current_block)
        
        for line in lines:
            clean_line = line.split(';')[0].strip() # Remove comments
            if not clean_line: continue
            
            if clean_line.endswith(':'):
                label = clean_line[:-1]
                # Previous block falls through if no exit instruction
                last_instr = current_block["code"][-1].lower() if current_block["code"] else ""
                if "jmp" not in last_instr and "ret" not in last_instr:
                    current_block["next"].append(label)
                
                current_block = {"id": label, "label": label, "code": [], "next": []}
                nodes.append(current_block)
            else:
                current_block["code"].append(clean_line)
                # Parse Jump Targets
                for jmp_instr in ["jmp", "jz", "jnz", "jl", "jg", "je", "jne", "jb", "ja"]:
                    if clean_line.lower().startswith(jmp_instr):
                        target = clean_line.split()[-1]
                        current_block["next"].append(target)
                        # If it's a conditional jump, it also falls through
                        if jmp_instr != "jmp":
                             # We'll handle fallthrough on the next label/instruction
                             pass
    else:
        # Enhanced C/Python Parser: Splits on Branches
        current_block = {"id": "start", "label": "Entry", "code": [], "next": []}
        nodes.append(current_block)
        
        for line in lines:
            if any(k in line for k in ["if", "while", "for", "else"]):
                # Split current block
                true_id = f"block_{len(nodes)+1}"
                false_id = f"block_{len(nodes)+2}"
                current_block["code"].append(line)
                current_block["next"] = [true_id, false_id]
                
                nodes.append({"id": true_id, "label": "True Path", "code": ["// logic"], "next": [f"merge_{len(nodes)}"]})
                nodes.append({"id": false_id, "label": "False Path", "code": ["// alternate"], "next": [f"merge_{len(nodes)}"]})
                
                current_block = {"id": f"merge_{len(nodes)-1}", "label": "Merge", "code": [], "next": []}
                nodes.append(current_block)
            else:
                current_block["code"].append(line)

    # Clean up empty blocks and dangling references
    valid_ids = {n["id"] for n in nodes}
    for n in nodes:
        n["next"] = [nxt for nmp, nxt in enumerate(n["next"]) if nxt in valid_ids or nmp == 0] # Keep at least one path if heuristic
        
    return nodes

def parse_code_to_ast(code: str, language: str = "c"):
    if language == "asm":
        return {
            "type": "InstructionStream",
            "operator": "EXEC",
            "left": {
                "type": "ArithmeticOp", "operator": "LEA",
                "left": {"type": "Literal", "value": "EAX"},
                "right": {"type": "Literal", "value": "[EBX+4]"}
            },
            "right": {"type": "Literal", "value": "RET"}
        }
    return {
        "type": "BinaryExpression", "operator": "+",
        "left": {
            "type": "BinaryExpression", "operator": "*",
            "left": {"type": "Literal", "value": 100}, "right": {"type": "Literal", "value": 50}
        },
        "right": {"type": "Literal", "value": 10}
    }

# --- Endpoints ---

@app.post("/api/analyze/all")
def analyze_all(req: AnalysisRequest):
    cfg = parse_code_to_cfg(req.code, req.language)
    ast = parse_code_to_ast(req.code, req.language)
    return {"cfg_nodes": cfg, "ast_tree": ast, "summary": f"Analyzed {req.language.upper()} source."}

@app.post("/api/cfg/flatten")
def flatten_cfg(req: Dict[str, Any]):
    nodes = req.get("nodes", [])
    flattened_nodes = []
    dispatcher = {"id": "dispatcher", "label": "Dispatcher", "code": ["while(1) {", " switch(state) {"], "next": [n["id"] for n in nodes]}
    for i, n in enumerate(nodes):
        flattened_nodes.append({
            "id": n["id"], "label": f"Case 0x{i:02X}", 
            "code": [f"case 0x{i:02X}:"] + n["code"] + [f"state = next;"], "next": ["dispatcher"]
        })
    return {"dispatcher": dispatcher, "blocks": flattened_nodes}

@app.post("/api/ast/simplify")
def simplify_ast(node: Dict[str, Any]):
    def fold(n):
        if n["type"] == "Literal": return n["value"], False
        if n["type"] == "BinaryExpression":
            l, lc = fold(n["left"]); r, rc = fold(n["right"])
            if isinstance(l, (int,float)) and isinstance(r, (int,float)):
                op = n["operator"]
                if op == "+": res = l+r
                elif op == "*": res = l*r
                else: return n, False
                return res, True
            return n, lc or rc
        return n, False
    v, c = fold(node)
    return {"type": "Literal", "value": v, "simplified": True} if c and not isinstance(v, dict) else {**node, "simplified": c}

@app.post("/api/entropy/scan")
def scan_entropy(req: EntropyRequest):
    try: b = bytes.fromhex(req.data)
    except: raise HTTPException(400, "Invalid hex")
    n, w = len(b), req.window_size
    if n < w: return {"entropy_values": [0]*n}
    res = []
    freq = [0]*256
    for i in range(w): freq[b[i]] += 1
    def h(f, wl):
        s = 0
        for c in f:
            if c > 0: p = c/wl; s -= p * math.log2(p)
        return s
    res.append(h(freq, w))
    for i in range(1, n-w+1):
        freq[b[i-1]] -= 1; freq[b[i+w-1]] += 1
        res.append(h(freq, w))
    return {"entropy_values": res}

@app.post("/api/poly/align")
def align_sequences(req: AlignmentRequest):
    # Tokenize instructions instead of characters
    s1 = [t.strip() for t in re.split('[;\n]', req.seq1) if t.strip()]
    s2 = [t.strip() for t in re.split('[;\n]', req.seq2) if t.strip()]
    
    m, n = len(s1), len(s2)
    
    # Needleman-Wunsch Global Alignment
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1): dp[i][0] = dp[i-1][0] + req.gap
    for j in range(1, n + 1): dp[0][j] = dp[0][j-1] + req.gap
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            match_score = req.match if s1[i-1] == s2[j-1] else req.mismatch
            dp[i][j] = max(
                dp[i-1][j-1] + match_score, 
                dp[i-1][j] + req.gap,       
                dp[i][j-1] + req.gap        
            )
    
    score = dp[m][n]
    max_possible = max(m, n) * req.match if max(m, n) > 0 else 1
    similarity = max(0, min(100, (score / max_possible) * 100)) if score > 0 else 0
    
    return {
        "score": score,
        "similarity": similarity,
        "tokens1": s1,
        "tokens2": s2,
        "matrix": dp if m < 30 and n < 30 else None # Increased limit for instructions
    }

class RERequest(BaseModel):
    code: str
    pattern: str

# --- Helpers ---

def kmp_search(text: str, pattern: str):
    # DAA Algorithm: Knuth-Morris-Pratt O(N + M)
    m, n = len(pattern), len(text)
    if m == 0: return []
    
    # Precompute PI table
    pi = [0] * m
    j = 0
    for i in range(1, m):
        while j > 0 and pattern[i] != pattern[j]:
            j = pi[j-1]
        if pattern[i] == pattern[j]:
            j += 1
        pi[i] = j
        
    # Search
    matches = []
    j = 0
    for i in range(n):
        while j > 0 and text[i] != pattern[j]:
            j = pi[j-1]
        if text[i] == pattern[j]:
            j += 1
        if j == m:
            matches.append(i - m + 1)
            j = pi[j-1]
    return matches

# --- Endpoints ---
@app.post("/api/re/analyze")
def analyze_re(req: RERequest):
    matches = kmp_search(req.code, req.pattern)
    return {
        "matches": matches,
        "count": len(matches),
        "algorithm": "Knuth-Morris-Pratt",
        "complexity": "O(N + M)"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
