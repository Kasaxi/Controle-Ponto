"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Upload, 
  UserCircle 
} from "lucide-react"

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Espelho de Ponto", href: "/espelho", icon: FileText },
  { name: "Upload", href: "/upload", icon: Upload },
  { name: "Funcionários", href: "/funcionarios", icon: Users },
  { name: "Feriados", href: "/feriados", icon: Calendar },
  { name: "Relatórios", href: "/relatorios", icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white transition-transform">
      <div className="flex h-full flex-col overflow-y-auto px-3 py-4">
        <div className="mb-10 px-2 py-4">
          <h1 className="text-2xl font-bold text-blue-600 tracking-tight">Ponto Pro</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            Gestão Interna
          </p>
        </div>
        
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-blue-600" : "text-slate-400")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t pt-4 px-2">
            <div className="flex items-center gap-3 py-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">Admin RH</span>
                    <span className="text-xs text-slate-500">Sair da conta</span>
                </div>
            </div>
        </div>
      </div>
    </aside>
  )
}
