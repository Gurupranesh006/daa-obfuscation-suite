
import { Link, useLocation, Outlet } from 'react-router-dom';

const Layout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'CFG Visualizer', path: '/cfg', icon: 'account_tree' },
    { name: 'Polymorphic Detection', path: '/poly', icon: 'security' },
    { name: 'AST Simplifier', path: '/ast', icon: 'code' },
    { name: 'Entropy Scanner', path: '/entropy', icon: 'analytics' },
  ];

  const secondaryNav = [
    { name: 'Documentation', path: '#', icon: 'description' },
    { name: 'Support', path: '#', icon: 'help' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-surface border-b border-subtle">
        <div className="flex items-center gap-4">
          <span className="font-headline-md text-headline-md font-bold text-secondary tracking-tight">
            DAA: Obfuscation & Deobfuscation
          </span>
        </div>
        <div className="hidden md:flex gap-6 items-center">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${
                location.pathname === item.path
                  ? 'text-secondary border-b-2 border-secondary'
                  : 'text-on-surface-variant hover:text-on-surface'
              } pb-1 font-label-caps text-label-caps transition-colors duration-200`}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-container-high border border-subtle flex items-center justify-center overflow-hidden">
            <img
              alt="User"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH0Shpn33dfswHqwdZ1FNd5sm55IHWbHFysl5v_VvAbkie0RycEEN1BivB_bJQ-5wwG1ZBL3UgtUruDUeUqPHaWstxdtK8Ao4fcOwtZW4wP1HfSJe4OsOooIpJ3UyJh2FUKBRdWYRs4TV9f5B0jNsUEWfAYZLG1YzDCRpQivF98Z-xjhSLRIDpcQNuQkGHLzlj2NkYVFxn4wmUesuPxgiHNkL_YQdS4c430jBgAsmEldSpc5O198IOPhQfMwZcblamg81wIu5LUQA"
            />
          </div>
        </div>
      </nav>

      <div className="flex flex-1 pt-16">
        {/* SideNavBar */}
        <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-64px)] w-64 flex-col bg-surface-container border-r border-subtle z-40">
          <div className="p-6 border-b border-subtle">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Project Modules</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Analytical Engine v1.0</p>
          </div>
          <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 p-3 transition-transform active:scale-95 ${
                  location.pathname === item.path
                    ? 'bg-secondary-container text-on-secondary-container font-bold border-l-4 border-secondary rounded-r'
                    : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface rounded'
                } transition-all duration-150`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-caps text-label-caps">{item.name}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto p-3 border-t border-subtle flex flex-col gap-1">
            {secondaryNav.map((item) => (
              <a
                key={item.name}
                href={item.path}
                className="flex items-center space-x-3 p-3 transition-transform active:scale-95 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface rounded transition-all duration-150"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-caps text-label-caps">{item.name}</span>
              </a>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 px-6 flex justify-between items-center bg-surface-container-lowest border-t border-subtle md:pl-[280px]">
        <div className="flex gap-4 font-label-caps text-label-caps text-on-surface-variant">
          <a className="hover:text-secondary transition-colors" href="#">Terms</a>
          <a className="hover:text-secondary transition-colors" href="#">Privacy</a>
          <a className="hover:text-secondary transition-colors" href="#">Repository</a>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
