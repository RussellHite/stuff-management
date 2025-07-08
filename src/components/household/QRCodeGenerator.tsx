'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { X, Download, Copy } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface QRCodeGeneratorProps {
  value: string
  itemName: string
  onClose: () => void
}

export default function QRCodeGenerator({ value, itemName, onClose }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    generateQRCode()
  }, [value])

  const generateQRCode = async () => {
    try {
      setIsGenerating(true)
      
      const qrCodeDataUrl = await QRCode.toDataURL(value, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeUrl(qrCodeDataUrl)
    } catch (error) {
      toast.error('Failed to generate QR code')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeUrl) return

    const link = document.createElement('a')
    link.download = `${itemName.replace(/\s+/g, '_')}_QR_Code.png`
    link.href = qrCodeUrl
    link.click()
  }

  const copyQRCode = async () => {
    if (!qrCodeUrl) return

    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ])
      
      toast.success('QR code copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy QR code')
    }
  }

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('QR code value copied')
    } catch (error) {
      toast.error('Failed to copy value')
    }
  }

  const printQRCode = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${itemName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: white;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 2px solid #000;
              border-radius: 10px;
              background: white;
            }
            .item-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #333;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-value {
              font-size: 12px;
              color: #666;
              margin-top: 15px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="item-name">${itemName}</div>
            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
            <div class="qr-value">${value}</div>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-4">{itemName}</h4>
          
          {isGenerating ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="mx-auto mb-4"
              />
              <p className="text-xs text-gray-500 break-all">{value}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-2">
          <button
            onClick={downloadQRCode}
            disabled={isGenerating}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={copyQRCode}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Image
            </button>
            
            <button
              onClick={copyValue}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Value
            </button>
          </div>
          
          <button
            onClick={printQRCode}
            disabled={isGenerating}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            🖨️ Print QR Code
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Print and stick QR codes on containers for quick scanning and inventory updates.
          </p>
        </div>
      </div>
    </div>
  )
}