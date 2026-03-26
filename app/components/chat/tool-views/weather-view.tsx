"use client"

import { Cloud, Droplets, MapPin, Sun, Thermometer } from "lucide-react"

interface WeatherData {
  location: string
  temperature: number
  condition: string
  humidity: number
}

interface WeatherViewProps {
  input: { location: string }
  output?: WeatherData
  state: string
}

export function WeatherView({ input, output, state }: WeatherViewProps) {
  if (state === "partial-call" || !output) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground animate-pulse">
        <Cloud className="h-4 w-4" />
        <span>Checking weather in {input.location}...</span>
      </div>
    )
  }

  const conditionIcon = output.condition === "sunny" ? (
    <Sun className="h-5 w-5 text-yellow-500" />
  ) : (
    <Cloud className="h-5 w-5 text-gray-400" />
  )

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm max-w-xs">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">{output.location}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {conditionIcon}
          <span className="text-2xl font-bold">{output.temperature}°F</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Droplets className="h-4 w-4" />
          <span>{output.humidity}%</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground capitalize">
        {output.condition}
      </div>
    </div>
  )
}
