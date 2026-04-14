import { Bell, Search } from "lucide-react"

export function Header() {
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(new Date())

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white px-8">
      <div className="flex flex-1 items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800 capitalize">{todayFormatted}</h2>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar colaborador..."
            className="h-9 w-64 rounded-lg bg-slate-50 pl-9 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        
        <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-50 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
        </button>

        <div className="h-8 w-[1px] bg-slate-200"></div>

        <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Unidade Matriz</span>
        </div>
      </div>
    </header>
  )
}
