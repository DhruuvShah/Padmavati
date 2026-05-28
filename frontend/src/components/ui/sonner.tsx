"use client"

import React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "rgba(255, 255, 255, 0.75)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "rgba(255, 255, 255, 0.45)",
          "--border-radius": "1.5rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "toast-glass",
          actionButton: "toast-action-btn",
          cancelButton: "toast-cancel-btn",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
