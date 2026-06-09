// // components/Sidebar.tsx
// "use client";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { logoutAction } from "@/actions/auth";
// import { initials } from "@/helpers/format";

// export interface NavItem {
//   href: string;
//   label: string;
//   icon: string;
// }

// interface SidebarProps {
//   items: NavItem[];
//   role: string;
//   userName?: string;
//   userEmail?: string;
// }

// export default function Sidebar({ items, role, userName, userEmail }: SidebarProps) {
//   const pathname = usePathname();

//   const isActive = (href: string) =>
//     pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

//   return (
//     <aside className="sidebar">
//       {/* Brand */}
//       <div className="sidebar-brand">
//         <div className="sidebar-logo">A</div>
//         <div>
//           <div className="sidebar-brand-text">Aset FTI</div>
//           <div className="sidebar-brand-role">{role}</div>
//         </div>
//       </div>

//       {/* Navigation */}
//       <nav className="sidebar-nav">
//         {items.map((item) => (
//           <Link
//             key={item.href}
//             href={item.href}
//             className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
//           >
//             <i className={`ti ${item.icon}`} style={{ fontSize: 17, width: 20, textAlign: "center" }} />
//             {item.label}
//           </Link>
//         ))}
//       </nav>

//       {/* User footer */}
//       <div className="sidebar-footer">
//         <div className="sidebar-user">
//           <div className="avatar">{initials(userName)}</div>
//           <div>
//             <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
//               {userName ?? "User"}
//             </div>
//             <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
//               {userEmail ?? role}
//             </div>
//           </div>
//         </div>

//         <form action={logoutAction}>
//           <button type="submit" className="sidebar-item" style={{ width: "100%", background: "none", border: "none" }}>
//             <i className="ti ti-logout" style={{ fontSize: 17, width: 20, textAlign: "center" }} />
//             Logout
//           </button>
//         </form>
//       </div>
//     </aside>
//   );
// }
