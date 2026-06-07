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

def disassemble_hex(hex_str: str) -> str:
    # Lift raw hex to Pseudo-ASM for analysis
    # Use regex to find pairs of hex digits, ignoring \x, 0x, and other wrappers
    hex_pairs = re.findall(r'[0-9a-fA-F]{2}', hex_str)
    if not hex_pairs:
        return \"; No valid hex data found\"
    
    try:
        bytes_data = bytes.fromhex(\"\".join(hex_pairs))
    except:
        return \"error: invalid hex data\"

    asm_lines = []
    i = 0
    # Safety cap to prevent browser explosion for giant binaries
    MAX_INSTR = 500

    while i < len(bytes_data) and len(asm_lines) < MAX_INSTR:
        # Detect large null chunks (common in PE headers)
        if i + 3 < len(bytes_data) and bytes_data[i:i+4] == b'\x00\x00\x00\x00':
            start_i = i
            while i < len(bytes_data) and bytes_data[i] == 0:
                i += 1
            asm_lines.append(f"; skipped {i - start_i} null bytes")
            continue

        b = bytes_data[i]

        # Common x86/x64 Opcode Lifting
        if b == 0x55: 
            asm_lines.append("push rbp")
            i += 1
        elif b == 0x5D:
            asm_lines.append("pop rbp")
            i += 1
        elif b == 0x48 and i+2 < len(bytes_data) and bytes_data[i+1] == 0x89 and bytes_data[i+2] == 0xE5:
            asm_lines.append("mov rbp, rsp")
            i += 3
        elif b == 0x8b and i+1 < len(bytes_data) and bytes_data[i+1] == 0xec:
            asm_lines.append("mov ebp, esp")
            i += 2
        elif b == 0xB8:
            if i + 4 < len(bytes_data):
                val = int.from_bytes(bytes_data[i+1:i+5], 'little')
                asm_lines.append(f"mov eax, {hex(val)}")
                i += 5
            else:
                asm_lines.append("mov eax, ???")
                i += 1
        elif b == 0x33 and i+1 < len(bytes_data): # XOR
            regs = {0xc0: "eax, eax", 0xdb: "ebx, ebx", 0xc9: "ecx, ecx", 0xd2: "edx, edx"}
            asm_lines.append(f"xor {regs.get(bytes_data[i+1], 'reg, reg')}")
            i += 2
        elif b == 0xE8: # CALL
            if i + 4 < len(bytes_data):
                off = int.from_bytes(bytes_data[i+1:i+4], 'little', signed=True)
                asm_lines.append(f"call sub_{hex(i+5+off)}")
                i += 5
            else:
                asm_lines.append("call ???")
                i += 1
        elif b == 0x39: 
            asm_lines.append("cmp eax, edx")
            i += 2
        elif b == 0x74: 
            asm_lines.append(f"jz loc_{hex(bytes_data[i+1])}")
            i += 2
        elif b == 0xEB: 
            asm_lines.append(f"jmp loc_{hex(bytes_data[i+1])}")
            i += 2
        elif b == 0xC3: 
            asm_lines.append("ret")
            i += 1
        elif b == 0x90: 
            asm_lines.append("nop")
            i += 1
        else:
            asm_lines.append(f"db {hex(b)}")
            i += 1

    if i < len(bytes_data):
        asm_lines.append(f"; ... truncated ({len(bytes_data) - i} bytes remain)")

    return "\n".join(asm_lines)
def parse_code_to_cfg(code: str, language: str = "c"):
    # If language is hex, lift it first
    if language == "hex":
        code = disassemble_hex(code)
        language = "asm"

    lines = [line.strip() for line in code.split('\n') if line.strip()]
    nodes = []
    
    if language == "asm":
        current_block = {"id": "entry", "label": "Entry", "code": [], "next": []}
        nodes.append(current_block)
        
        for line in lines:
            # Strip comments for block logic
            clean_line = line.split(';')[0].strip()

            if not clean_line:
                # Keep comments in the code block even if no instruction exists
                current_block[\"code\"].append(line.strip())
                continue

            if clean_line.endswith(':'):

                label = clean_line[:-1]
                last_instr = current_block["code"][-1].lower() if current_block["code"] else ""
                if "jmp" not in last_instr and "ret" not in last_instr:
                    current_block["next"].append(label)
                current_block = {"id": label, "label": label, "code": [], "next": []}
                nodes.append(current_block)
            else:
                current_block["code"].append(clean_line)
                for jmp_instr in ["jmp", "jz", "jnz", "jl", "jg", "je", "jne", "jb", "ja", "loc"]:
                    if jmp_instr in clean_line.lower():
                        # Extract loc_XX or target
                        parts = clean_line.split()
                        target = parts[-1] if len(parts) > 1 else "end"
                        current_block["next"].append(target)
    else:
        current_block = {"id": "start", "label": "Entry", "code": [], "next": []}
        nodes.append(current_block)
        for line in lines:
            if any(k in line for k in ["if", "while", "for", "else"]):
                true_id, false_id = f"block_{len(nodes)+1}", f"block_{len(nodes)+2}"
                current_block["code"].append(line); current_block["next"] = [true_id, false_id]
                nodes.append({"id": true_id, "label": "True Path", "code": ["// logic"], "next": [f"merge_{len(nodes)}"]})
                nodes.append({"id": false_id, "label": "False Path", "code": ["// alternate"], "next": [f"merge_{len(nodes)}"]})
                current_block = {"id": f"merge_{len(nodes)-1}", "label": "Merge", "code": [], "next": []}
                nodes.append(current_block)
            else: current_block["code"].append(line)

    valid_ids = {n["id"] for n in nodes}
    for n in nodes: n["next"] = [nxt for nmp, nxt in enumerate(n["next"]) if nxt in valid_ids or nmp == 0]
    return nodes

def parse_code_to_ast(code: str, language: str = "c"):
    if language == "hex":
        code = disassemble_hex(code)
        language = "asm"
        
    if language == "asm":
        return {
            "type": "InstructionStream", "operator": "EXEC",
            "left": {
                "type": "ArithmeticOp", "operator": "LIFTED_OP",
                "left": {"type": "Literal", "value": "BIN_DAT"},
                "right": {"type": "Literal", "value": "0x42"}
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
    display_code = req.code
    if req.language == "hex":
        display_code = disassemble_hex(req.code)
        
    cfg = parse_code_to_cfg(req.code, req.language)
    ast = parse_code_to_ast(req.code, req.language)
    
    return {
        "cfg_nodes": cfg, 
        "ast_tree": ast, 
        "disassembled": display_code,
        "summary": f"Analyzed {req.language.upper()} source."
    }

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
                op = n["operator"]; res = l+r if op == "+" else l*r
                return res, True
            return n, lc or rc
        return n, False
    v, c = fold(node)
    return {"type": "Literal", "value": v, "simplified": True} if c and not isinstance(v, dict) else {**node, "simplified": c}

@app.post("/api/entropy/scan")
def scan_entropy(req: EntropyRequest):
    try: b = bytes.fromhex(req.data.replace(" ", ""))
    except: raise HTTPException(400, "Invalid hex")
    n, w = len(b), req.window_size
    if n == 0: return {"entropy_values": []}
    
    # If payload is smaller than window, calculate entropy of the whole block
    if n < w:
        freq = [0]*256
        for byte in b: freq[byte] += 1
        def h_simple(f, wl):
            s = 0
            for c in f:
                if c > 0: p = c/wl; s -= p * math.log2(p)
            return s
        val = h_simple(freq, n)
        return {"entropy_values": [val]*n}
    
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
    s1 = [t.strip() for t in re.split('[;\n]', req.seq1) if t.strip()]
    s2 = [t.strip() for t in re.split('[;\n]', req.seq2) if t.strip()]
    m, n = len(s1), len(s2)
    dp = [[0]*(n+1) for _ in range(m+1)]
    for i in range(1, m+1): dp[i][0] = dp[i-1][0] + req.gap
    for j in range(1, n+1): dp[0][j] = dp[0][j-1] + req.gap
    for i in range(1, m+1):
        for j in range(1, n+1):
            ms = req.match if s1[i-1] == s2[j-1] else req.mismatch
            dp[i][j] = max(dp[i-1][j-1]+ms, dp[i-1][j]+req.gap, dp[i][j-1]+req.gap)
    return {"score": dp[m][n], "similarity": max(0, min(100, (dp[m][n]/(max(m,n)*req.match))*100)) if m+n>0 else 0, "tokens1": s1, "tokens2": s2, "matrix": dp if m<30 and n<30 else None}

class RERequest(BaseModel):
    code: str
    pattern: str
    language: str = "asm"

def kmp_search(text: str, pattern: str):
    m, n = len(pattern), len(text)
    if m == 0: return []
    pi = [0]*m; j = 0
    for i in range(1, m):
        while j > 0 and pattern[i] != pattern[j]: j = pi[j-1]
        if pattern[i] == pattern[j]: j += 1
        pi[i] = j
    matches = []; j = 0
    for i in range(n):
        while j > 0 and text[i] != pattern[j]: j = pi[j-1]
        if text[i] == pattern[j]: j += 1
        if j == m: matches.append(i-m+1); j = pi[j-1]
    return matches

@app.post("/api/re/analyze")
def analyze_re(req: RERequest):
    text = req.code
    if req.language == "hex":
        text = disassemble_hex(req.code)
    matches = kmp_search(text, req.pattern)
    return {"matches": matches, "count": len(matches), "algorithm": "KMP", "complexity": "O(N+M)"}

@app.post("/api/re/generate-hex")
def generate_hex(req: Dict[str, Any]):
    lines = req.get("code", "").split('\n')
    hex_dump = []
    opcodes = {"int": "55 48 89 E5", "if": "48 39 D0 7F", "return": "B8 01 00 00 5D C3", "mov": "B8", "cmp": "39", "add": "01", "xor": "31"}
    for line in lines:
        matched = False
        for key, val in opcodes.items():
            if key in line.lower(): hex_dump.append(val); matched = True; break
        if not matched: hex_dump.append("90 90 90")
    return {"hex": " ".join(hex_dump).upper()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
