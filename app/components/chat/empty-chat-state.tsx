"use client"

import { useTranslation } from "@/app/contexts/i18n-context"
import { useAuth } from "@/app/hooks/use-auth"
import { useChatContext } from "@/app/contexts/chat-context"
import { Code, PenLine, BarChart3, Lightbulb, ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

interface SuggestionCardProps {
  icon: ReactNode
  title: string
  prompt: string
  onClick: (prompt: string) => void
}

function SuggestionCard({ icon, title, prompt, onClick }: SuggestionCardProps) {
  return (
    <button
      onClick={() => onClick(prompt)}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/50 hover:bg-accent/50 hover:border-border transition-all text-left w-full"
    >
      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1 truncate">
        {title}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all shrink-0" />
    </button>
  )
}

export function EmptyChatState() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { actions } = useChatContext()

  const name = user?.name

  const handleSuggestionClick = (prompt: string) => {
    actions.send({ text: prompt, files: [] }, [])
  }

  const suggestions = [
    {
      icon: <Code className="h-4 w-4" />,
      title: t("chat.suggestions.coding") || "Write a Python script to analyze CSV data",
      prompt: t("chat.suggestions.codingPrompt") || "Write a Python script that reads a CSV file and generates a summary report with statistics",
    },
    {
      icon: <PenLine className="h-4 w-4" />,
      title: t("chat.suggestions.writing") || "Help me draft a professional email",
      prompt: t("chat.suggestions.writingPrompt") || "Help me draft a professional email to my team about the upcoming project deadline",
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      title: t("chat.suggestions.analysis") || "Explain a complex concept simply",
      prompt: t("chat.suggestions.analysisPrompt") || "Explain how neural networks work in simple terms with analogies",
    },
    {
      icon: <Lightbulb className="h-4 w-4" />,
      title: t("chat.suggestions.creative") || "Brainstorm creative project ideas",
      prompt: t("chat.suggestions.creativePrompt") || "Brainstorm 5 creative side project ideas for a developer who wants to learn AI",
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center flex-1 max-w-2xl mx-auto px-4 text-center">
      <div className="space-y-8 mb-8 w-full">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            {name
              ? t("chat.welcome.titleWithName", { name })
              : t("chat.welcome.title")}
          </h1>
          <p className="text-base text-muted-foreground">
            {t("chat.welcome.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
          {suggestions.map((suggestion, index) => (
            <SuggestionCard
              key={index}
              icon={suggestion.icon}
              title={suggestion.title}
              prompt={suggestion.prompt}
              onClick={handleSuggestionClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
