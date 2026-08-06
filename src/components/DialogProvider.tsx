'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type DialogType = 'alert' | 'confirm'

interface DialogState {
  isOpen: boolean
  type: DialogType
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

interface DialogContextType {
  showAlert: (title: string, message: string) => Promise<void>
  showConfirm: (title: string, message: string) => Promise<boolean>
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export const useDialog = () => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  })

  const showAlert = useCallback((title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setDialog({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }))
          resolve()
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, isOpen: false }))
          resolve()
        }
      })
    })
  }, [])

  const showConfirm = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }))
          resolve(true)
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, isOpen: false }))
          resolve(false)
        }
      })
    })
  }, [])

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      <AnimatePresence>
        {dialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm"
              onClick={dialog.type === 'confirm' ? dialog.onCancel : dialog.onConfirm}
            />
            
            {/* Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[var(--surface)] border-2 border-[var(--ink)] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-[var(--ink)] px-4 py-2 flex items-center gap-2 text-[var(--paper)]">
                {dialog.type === 'alert' ? <Info className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span className="font-mono text-xs font-bold tracking-widest uppercase">{dialog.title}</span>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <p className="font-serif text-[var(--ink)] text-lg leading-relaxed mb-8">
                  {dialog.message}
                </p>
                
                {/* Actions */}
                <div className="flex gap-3 justify-end border-t border-[var(--rule)] border-dashed pt-4">
                  {dialog.type === 'confirm' && (
                    <button
                      onClick={dialog.onCancel}
                      className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-[var(--ink)] border border-[var(--rule)] hover:bg-[var(--rule)]/20 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={dialog.onConfirm}
                    className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-[var(--paper)] bg-[var(--stamp)] hover:bg-[#73252E] transition-colors border border-[var(--stamp)]"
                  >
                    {dialog.type === 'alert' ? 'Acknowledge' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  )
}
