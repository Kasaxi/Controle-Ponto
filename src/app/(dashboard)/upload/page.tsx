"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileType, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  
  // Mock results for now
  const [results, setResults] = useState<{
    total: number,
    imported: number,
    errors: number
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setUploadStatus("idle")
      setResults(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.txt')) {
        setFile(droppedFile)
        setUploadStatus("idle")
        setResults(null)
      } else {
        alert("Por favor, selecione apenas arquivos .TXT")
      }
    }
  }

  const processFile = async () => {
    if (!file) return
    setIsUploading(true)
    setUploadStatus("idle")

    try {
        const text = await file.text()
        const { parseFileContent, calculatePonto } = await import("@/lib/ponto-calculator")
        
        // Extrai as linhas do txt
        const marcacoesRaw = parseFileContent(text)
        
        if (marcacoesRaw.length === 0) {
            alert("Nenhuma marcação válida encontrada no arquivo.")
            setIsUploading(false)
            return
        }

        // Buscar funcionários do Appwrite
        const { databases } = await import("@/lib/appwrite")
        const empResponse = await databases.listDocuments('ponto-eletronico', 'funcionarios', [
            // No appwrite real poderiamos usar queries mais específicas, mas paginamos tudo aqui para MVP
        ])
        
        const funcionarios = empResponse.documents as any[]

        // Calcular Ponto Dia
        const pontosDia = calculatePonto(marcacoesRaw, funcionarios)

        // Salvar os registros (Pode ser otimizado fazendo batches, aqui faremos iteração iterativa para MVP)
        // Como o appwrite web/sdk não possui bulk insert simples, iteraremos as promessas de inserção:
        // Calculando totais para não dar falso positivo de erro
        let errorsCount = 0
        let savedCount = 0
        
        const batch = pontosDia.slice(0, 100);
        
        for (const ponto of batch) {
            try {
                const cleanPonto: Record<string, any> = {}
                Object.entries(ponto).forEach(([key, value]) => {
                    if (value !== null) {
                        cleanPonto[key] = value
                    }
                })
                
                const func = funcionarios.find(f => f.$id === ponto.funcionarioId)
                if (func) {
                    cleanPonto.funcionarioId = func.idRelogio
                } else {
                    cleanPonto.funcionarioId = 0
                }

                const { databases } = await import("@/lib/appwrite")
                
                // Usando ID Determinístico para evitar batidas duplicadas
                // ID: "ponto_IDRELOGIO_DATACURTA"
                const dataCurta = cleanPonto.data.split('T')[0]
                const customId = `ponto_${cleanPonto.funcionarioId}_${dataCurta}`

                try {
                    await databases.createDocument('ponto-eletronico', 'ponto_dia', customId, cleanPonto)
                    savedCount++
                } catch (err: any) {
                    // Se já existir, faremos UPDATE ao invés de duplicar!
                    if (err.message && err.message.includes("already exists")) {
                        await databases.updateDocument('ponto-eletronico', 'ponto_dia', customId, cleanPonto)
                        savedCount++
                    } else {
                        throw err
                    }
                }
            } catch (err: any) {
                console.log("Falha na gravação do dia:", err.message)
                errorsCount++
            }
        }

        setUploadStatus("success")
        setResults({
            total: marcacoesRaw.length, // Linhas de batida
            imported: savedCount, // Dias processados 
            errors: errorsCount
        })
    } catch (e) {
        console.error(e)
        alert("Erro processando arquivo")
    } finally {
        setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload do Relógio de Ponto</h1>
        <p className="text-slate-500 text-sm">Importe o arquivo TXT ou AFD gerado pelo seu equipamento.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm h-fit">
            <CardHeader>
                <CardTitle>Selecionar Arquivo</CardTitle>
                <CardDescription>Formatos suportados: .txt, .afd</CardDescription>
            </CardHeader>
            <CardContent>
                <div 
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                        file ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-upload")?.click()}
                >
                    <input 
                        id="file-upload" 
                        type="file" 
                        accept=".txt,.afd" 
                        className="hidden" 
                        onChange={handleFileChange} 
                    />
                    
                    {file ? (
                        <div className="space-y-3">
                            <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <FileType className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-700">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="mx-auto w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-700">Clique ou arraste o arquivo aqui</p>
                                <p className="text-xs text-slate-400 mt-1">Gere o arquivo diretamento do relógio DIMEP/ControliD</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        disabled={!file || isUploading || uploadStatus === "success"}
                        onClick={processFile}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...
                            </>
                        ) : uploadStatus === "success" ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Upload Concluído
                            </>
                        ) : (
                            "Iniciar Importação"
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* Módulo de Resultados */}
        {uploadStatus !== "idle" && (
            <Card className="border-none shadow-sm animate-in slide-in-from-right-4 duration-300">
                <CardHeader>
                    <CardTitle>Resumo do Processamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isUploading ? (
                        <div className="flex flex-col items-center justify-center h-48 space-y-4 text-center">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
                                <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                            </div>
                            <p className="text-sm font-medium text-slate-600 animate-pulse">Lendo milhares de marcações...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-xl">
                                <CheckCircle2 className="h-6 w-6" />
                                <div>
                                    <p className="font-semibold">Arquivo processado com sucesso!</p>
                                    <p className="text-sm">As horas do espelho de ponto já foram recalculadas.</p>
                                </div>
                            </div>
                            
                            {results && (
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-4 bg-slate-50 rounded-xl border">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Total</p>
                                        <p className="text-2xl font-bold text-slate-800">{results.total}</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">Importadas</p>
                                        <p className="text-2xl font-bold text-emerald-700">{results.imported}</p>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                        <p className="text-xs text-red-600 font-medium uppercase tracking-wider mb-1">Erros</p>
                                        <p className="text-2xl font-bold text-red-700">{results.errors}</p>
                                    </div>
                                </div>
                            )}

                            {results?.errors && results.errors > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p>Houve linhas que não puderam ser importadas, geralmente porque o formato da linha não condiz com as normas do relógio ou o ID do funcionário não foi encontrado.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  )
}
