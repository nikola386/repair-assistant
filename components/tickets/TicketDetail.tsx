'use client'

import { useState, useRef, useEffect, useCallback, DragEvent } from 'react'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { RepairTicket, TicketStatus, TicketPriority, UpdateTicketInput, TicketImage, Expense } from '../../types/ticket'
import { useLanguage } from '../../contexts/LanguageContext'
import { useRouter } from 'next/navigation'
import Spinner from '../ui/Spinner'
import QRCode from 'react-qr-code'
import ExpenseTable from './ExpenseTable'
import { showAlert } from '../../lib/alerts'
import ConfirmationModal from '../ui/ConfirmationModal'
import { useConfirmation } from '../../lib/useConfirmation'
import { Warranty } from '../../types/warranty'
import WarrantyStatusBadge from '../warranties/WarrantyStatusBadge'
import Link from 'next/link'
import { useCurrency } from '../../lib/useCurrency'

interface TicketDetailProps {
  ticket: RepairTicket
  onTicketUpdate?: (ticket: RepairTicket) => void
}

export default function TicketDetail({ ticket, onTicketUpdate }: TicketDetailProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const confirmation = useConfirmation()
  const { formatCurrency } = useCurrency()
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]) // Files selected before upload
  const [updatedTicket, setUpdatedTicket] = useState<RepairTicket>(ticket)
  const [triggerAddExpense, setTriggerAddExpense] = useState(false)
  const [warranty, setWarranty] = useState<Warranty | null>(null)
  const [loadingWarranty, setLoadingWarranty] = useState(false)
  const [editFormData, setEditFormData] = useState<UpdateTicketInput>({
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    customerPhone: ticket.customerPhone,
    deviceType: ticket.deviceType,
    deviceBrand: ticket.deviceBrand || '',
    deviceModel: ticket.deviceModel || '',
    deviceSerialNumber: ticket.deviceSerialNumber || '',
    issueDescription: ticket.issueDescription,
    priority: ticket.priority,
    estimatedCost: ticket.estimatedCost,
    actualCost: ticket.actualCost,
    estimatedCompletionDate: ticket.estimatedCompletionDate,
    actualCompletionDate: ticket.actualCompletionDate,
    notes: ticket.notes || '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qrCodeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUpdatedTicket(ticket)
    setEditFormData({
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      customerPhone: ticket.customerPhone,
      deviceType: ticket.deviceType,
      deviceBrand: ticket.deviceBrand || '',
      deviceModel: ticket.deviceModel || '',
      deviceSerialNumber: ticket.deviceSerialNumber || '',
      issueDescription: ticket.issueDescription,
      priority: ticket.priority,
      estimatedCost: ticket.estimatedCost,
      actualCost: ticket.actualCost,
      estimatedCompletionDate: ticket.estimatedCompletionDate,
      actualCompletionDate: ticket.actualCompletionDate,
      notes: ticket.notes || '',
    })
  }, [ticket])

  const fetchWarranty = useCallback(async () => {
    setLoadingWarranty(true)
    try {
      const response = await fetch(`/api/warranties/ticket/${ticket.id}`)
      if (response.ok) {
        const data = await response.json()
        setWarranty(data.warranty)
      } else if (response.status !== 404) {
        console.error('Error fetching warranty')
      }
    } catch (error) {
      console.error('Error fetching warranty:', error)
    } finally {
      setLoadingWarranty(false)
    }
  }, [ticket.id])

  useEffect(() => {
    const currentStatus = updatedTicket?.status || ticket.status
    if (currentStatus === 'completed') {
      fetchWarranty()
    } else {
      setWarranty(null)
    }
  }, [ticket.status, updatedTicket?.status, fetchWarranty])

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const data = await response.json()
        const updatedTicketData = data.ticket
        setUpdatedTicket(updatedTicketData)
        
        if (newStatus === 'completed') {
          const completionResponse = await fetch(`/api/tickets/${ticket.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              actualCompletionDate: new Date().toISOString().split('T')[0]
            }),
          })
          if (completionResponse.ok) {
            const completionData = await completionResponse.json()
            const finalTicket = completionData.ticket
            setUpdatedTicket(finalTicket)
            
            if (onTicketUpdate) {
              onTicketUpdate(finalTicket)
            }
            
            setTimeout(() => {
              fetchWarranty()
            }, 500)
          } else {
            if (onTicketUpdate) {
              onTicketUpdate(updatedTicketData)
            }
            setTimeout(() => {
              fetchWarranty()
            }, 500)
          }
        } else {
          if (onTicketUpdate) {
            onTicketUpdate(updatedTicketData)
          }
        }
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
      showAlert.error(t.tickets.updateError)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdate = async (updates: UpdateTicketInput) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setUpdatedTicket(data.ticket)
        setIsEditing(false)
        if (onTicketUpdate) {
          onTicketUpdate(data.ticket)
        }
        router.refresh()
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
      showAlert.error(t.tickets.updateError || 'Error updating ticket')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editFormData.customerName || !editFormData.customerEmail || !editFormData.customerPhone || 
        !editFormData.deviceType || !editFormData.issueDescription) {
      showAlert.error(t.common.messages.required)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editFormData.customerEmail || '')) {
      showAlert.error(t.common.messages.invalidEmail)
      return
    }

    await handleUpdate(editFormData)
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    setPendingFiles((prev) => [...prev, ...newFiles])

    setUploadingImages(true)
    try {
      const uploadPromises = newFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('ticketId', ticket.id)

        const response = await fetch('/api/tickets/images', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to upload image')
        }

        const data = await response.json()
        return { file, image: data.image }
      })

      const results = await Promise.all(uploadPromises)
      
      const uploadedFiles = results.map((r) => r.file)
      setPendingFiles((prev) => prev.filter((file) => !uploadedFiles.includes(file)))
      
      const ticketResponse = await fetch(`/api/tickets/${ticket.id}`)
      if (ticketResponse.ok) {
        const ticketData = await ticketResponse.json()
        setUpdatedTicket(ticketData.ticket)
        if (onTicketUpdate) {
          onTicketUpdate(ticketData.ticket)
        }
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      showAlert.error('Failed to upload some images')
      setPendingFiles((prev) => prev.filter((file) => !newFiles.includes(file)))
    } finally {
      setUploadingImages(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploadingImages) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (uploadingImages) return
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleImageUpload(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleImageUpload(e.target.files)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    const confirmed = await confirmation.confirm({
      message: t.tickets.detail.confirmDeleteImage,
      variant: 'danger',
      confirmText: t.common.actions.delete,
      cancelText: t.common.actions.cancel,
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/tickets/images?imageId=${imageId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const ticketResponse = await fetch(`/api/tickets/${ticket.id}`)
        if (ticketResponse.ok) {
          const ticketData = await ticketResponse.json()
          setUpdatedTicket(ticketData.ticket)
          if (onTicketUpdate) {
            onTicketUpdate(ticketData.ticket)
          }
        }
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      showAlert.error(t.tickets.detail.deleteImageError)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirmation.confirm({
      message: t.common.messages.confirmDelete,
      variant: 'danger',
      confirmText: t.common.actions.delete,
      cancelText: t.common.actions.cancel,
    })

    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/tickets')
      } else {
        showAlert.error(t.tickets.deleteError)
        setIsDeleting(false)
      }
    } catch (error) {
      console.error('Error deleting ticket:', error)
      showAlert.error(t.tickets.deleteError)
      setIsDeleting(false)
    }
  }

  const currentTicket = updatedTicket || ticket
  
  const [ticketUrl, setTicketUrl] = useState<string>('')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/tickets/${currentTicket.id}`
      setTicketUrl(url)
    }
  }, [currentTicket.id])


  const handlePrintLabel = () => {
    if (!ticketUrl || !qrCodeRef.current) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrSvg = qrCodeRef.current.querySelector('svg')
    if (!qrSvg) return

    const qrSvgContent = qrSvg.outerHTML

    // Label dimensions: 62mm x 20mm (horizontal)
    // At 300 DPI: 732px x 236px
    // At 96 DPI (screen): 234px x 76px
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${currentTicket.ticketNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @page {
              size: 62mm 20mm;
              margin: 0;
            }
            body {
              width: 62mm;
              height: 20mm;
              margin: 0;
              padding: 0;
              background: white;
              font-family: Arial, sans-serif;
              overflow: hidden;
            }
            .label-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: row;
              align-items: center;
              padding: 3mm;
              box-sizing: border-box;
              gap: 2mm;
            }
            .label-qr-code {
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .label-qr-code svg {
              width: 13mm;
              height: 13mm;
            }
            .label-info {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 0.5mm;
              font-size: 6pt;
              line-height: 1.2;
            }
            .label-info-item {
              display: flex;
              flex-direction: row;
              align-items: baseline;
              gap: 0.5mm;
            }
            .label-info-label {
              font-weight: normal;
              color: black;
              white-space: nowrap;
            }
            .label-info-value {
              font-weight: normal;
              color: black;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .label-case {
              font-size: 7pt;
            }
            .label-case-value {
              font-weight: bold;
            }
            @media print {
              body {
                width: 62mm;
                height: 20mm;
              }
              .label-container {
                width: 62mm;
                height: 20mm;
              }
            }
            @media screen {
              body {
                width: 234px;
                height: 76px;
                border: 1px solid #ccc;
                margin: 20px auto;
              }
              .label-container {
                width: 234px;
                height: 76px;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="label-qr-code">
              ${qrSvgContent}
            </div>
            <div class="label-info">
              <div class="label-info-item label-case">
                <span class="label-info-label">Case#:</span>
                <span class="label-info-value label-case-value">${currentTicket.ticketNumber}</span>
              </div>
              <div class="label-info-item">
                <span class="label-info-label">Customer:</span>
                <span class="label-info-value">${currentTicket.customerName}</span>
              </div>
              <div class="label-info-item">
                <span class="label-info-label">Device:</span>
                <span class="label-info-value">${currentTicket.deviceBrand || ''} ${currentTicket.deviceModel || currentTicket.deviceType || 'N/A'}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
        }, 250)
      }, 250)
    }
  }

  const handleDownloadInvoice = async () => {
    setIsDownloadingInvoice(true)
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/invoice`)
      if (!response.ok) {
        throw new Error('Failed to generate invoice')
      }

      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${ticket.ticketNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      showAlert.success('Invoice downloaded successfully')
    } catch (error) {
      console.error('Error downloading invoice:', error)
      showAlert.error('Failed to download invoice')
    } finally {
      setIsDownloadingInvoice(false)
    }
  }


  return (
    <div className="ticket-detail">
      <div className="ticket-detail__header">
        <button
          className="ticket-detail__back"
          onClick={() => router.push('/tickets')}
        >
          ← {t.tickets.backToList || 'Back to List'}
        </button>
        <div className="ticket-detail__header-content">
          <div>
            <h1 className="ticket-detail__title">{currentTicket.ticketNumber}</h1>
            <div className="ticket-detail__meta">
              <span className={`ticket-status ticket-status--${currentTicket.status}`}>
                {t.common.status[currentTicket.status as keyof typeof t.common.status]}
              </span>
              <span className={`ticket-priority ticket-priority--${currentTicket.priority}`}>
                {t.common.priority[currentTicket.priority as keyof typeof t.common.priority]}
              </span>
            </div>
          </div>
          <div className="ticket-detail__actions">
            <button
              className="btn btn-secondary btn-sm btn--invoice-download"
              onClick={handleDownloadInvoice}
              disabled={isDownloadingInvoice}
            >
              <span className="btn__text btn__text--download">
                {t.tickets.detail.downloadInvoice}
              </span>
              <span className="btn__text btn__text--generating">
                <Spinner size="small" />
                <span>{t.tickets.detail.generatingInvoice}</span>
              </span>
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isUpdating}
            >
              {isEditing ? t.common.actions.cancel : t.common.actions.edit}
            </button>
            <button
              className={`btn btn-danger btn-sm ${isDeleting ? 'btn--loading' : ''}`}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner size="small" />
                  <span>{t.common.messages.deleting}</span>
                </>
              ) : (
                t.common.actions.delete
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="ticket-detail__content">
        {/* QR Code Section */}
        {ticketUrl && (
          <div className="ticket-detail__section ticket-detail__section--qr">
            <div className="ticket-detail__qr-container">
              <div className="ticket-detail__qr-code" ref={qrCodeRef}>
                <QRCode
                  value={ticketUrl}
                  size={120}
                  className="image-responsive"
                  viewBox={`0 0 120 120`}
                />
              </div>
              <div className="ticket-detail__qr-info">
                <div className="ticket-detail__qr-info-item ticket-detail__qr-info-case">
                  <span className="ticket-detail__qr-info-label">Case#:</span>
                  <span className="ticket-detail__qr-info-value">{currentTicket.ticketNumber}</span>
                </div>
                <div className="ticket-detail__qr-info-item">
                  <span className="ticket-detail__qr-info-label">Customer:</span>
                  <span className="ticket-detail__qr-info-value">{currentTicket.customerName}</span>
                </div>
                <div className="ticket-detail__qr-info-item">
                  <span className="ticket-detail__qr-info-label">Device:</span>
                  <span className="ticket-detail__qr-info-value">{currentTicket.deviceBrand || ''} {currentTicket.deviceModel || currentTicket.deviceType || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div className="ticket-detail__qr-buttons">
              <button
                className="btn btn-secondary btn-sm ticket-detail__qr-print-label"
                onClick={handlePrintLabel}
                title="Print label sticker"
              >
                {t.tickets.printLabel || 'Print Label'}
              </button>
            </div>
          </div>
        )}

        <div className="ticket-detail__section">
          <h2>{t.common.info.customerInformation}</h2>
          <div className="ticket-detail__info-grid">
            <div>
              <label>{t.tickets.form.customerName || 'Customer Name'}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editFormData.customerName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                  className="ticket-detail__edit-input"
                  required
                />
              ) : (
                <p>{currentTicket.customerName}</p>
              )}
            </div>
            <div>
              <label>{t.tickets.form.customerEmail || 'Customer Email'}</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editFormData.customerEmail || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, customerEmail: e.target.value })}
                  className="ticket-detail__edit-input"
                  required
                />
              ) : (
                <p><a href={`mailto:${currentTicket.customerEmail}`}>{currentTicket.customerEmail}</a></p>
              )}
            </div>
            <div>
              <label>{t.tickets.form.customerPhone || 'Customer Phone'}</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editFormData.customerPhone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                  className="ticket-detail__edit-input"
                  required
                />
              ) : (
                <p><a href={`tel:${currentTicket.customerPhone}`}>{currentTicket.customerPhone}</a></p>
              )}
            </div>
          </div>
        </div>

        <div className="ticket-detail__section">
          <h2>{t.common.info.deviceInformation}</h2>
          <div className="ticket-detail__info-grid">
            <div>
              <label>{t.tickets.form.deviceType || 'Device Type'}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editFormData.deviceType || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, deviceType: e.target.value })}
                  className="ticket-detail__edit-input"
                  required
                />
              ) : (
                <p>{currentTicket.deviceType}</p>
              )}
            </div>
            <div>
              <label>{t.tickets.form.deviceBrand || 'Device Brand'}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editFormData.deviceBrand || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, deviceBrand: e.target.value })}
                  className="ticket-detail__edit-input"
                />
              ) : (
                <p>{currentTicket.deviceBrand || '-'}</p>
              )}
            </div>
            <div>
              <label>{t.tickets.form.deviceModel || 'Device Model'}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editFormData.deviceModel || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, deviceModel: e.target.value })}
                  className="ticket-detail__edit-input"
                />
              ) : (
                <p>{currentTicket.deviceModel || '-'}</p>
              )}
            </div>
            <div>
              <label>{t.tickets.form.deviceSerialNumber || 'Device Serial Number'}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editFormData.deviceSerialNumber || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, deviceSerialNumber: e.target.value })}
                  className="ticket-detail__edit-input"
                />
              ) : (
                <p>{currentTicket.deviceSerialNumber || '-'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="ticket-detail__section">
          <h2>{t.tickets.issueDescription || 'Issue Description'}</h2>
          {isEditing ? (
            <textarea
              className="ticket-detail__edit-textarea"
              value={editFormData.issueDescription || ''}
              onChange={(e) => setEditFormData({ ...editFormData, issueDescription: e.target.value })}
              rows={6}
              required
            />
          ) : (
            <p className="ticket-detail__description">{currentTicket.issueDescription}</p>
          )}
        </div>

        <div className="ticket-detail__section">
          <h2>{t.tickets.form.notes || 'Notes'}</h2>
          {isEditing ? (
            <textarea
              className="ticket-detail__edit-textarea"
              value={editFormData.notes || ''}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              rows={5}
            />
          ) : (
            <p className="ticket-detail__notes">{currentTicket.notes || '-'}</p>
          )}
        </div>

        {/* Files Section */}
        <div className="ticket-detail__section">
          <h2>{t.tickets.detail.files}</h2>
          <div className="ticket-detail__images">
            {currentTicket.images && currentTicket.images.length > 0 ? (
              <div className="ticket-detail__image-gallery">
                {currentTicket.images.map((image) => (
                  <div key={image.id} className="ticket-detail__image-item">
                    {image.mimeType === 'application/pdf' ? (
                      <a
                        href={image.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ticket-detail__pdf-link"
                      >
                        <div className="ticket-detail__pdf-preview">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          <span>{image.fileName}</span>
                        </div>
                      </a>
                    ) : (
                      <Image
                        src={image.filePath}
                        alt={image.fileName}
                        width={300}
                        height={300}
                        className="ticket-detail__image image-cover"
                      />
                    )}
                    <button
                      className="ticket-detail__image-delete"
                      onClick={() => handleDeleteImage(image.id)}
                      aria-label="Delete file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ticket-detail__no-images">{t.tickets.detail.noFilesUploaded}</p>
            )}
            <div
              className={`image-upload-area ${isDragging ? 'drag-over' : ''} ${uploadingImages ? 'uploading' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                id="ticket-images"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileSelect}
                disabled={uploadingImages}
                className="image-upload-input"
              />
              <label htmlFor="ticket-images" className="image-upload-label">
                <svg className="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span className="upload-text">
                  {uploadingImages ? (
                    <>{t.tickets.form.uploadingImages}</>
                  ) : (
                    <>
                      <strong>{t.tickets.detail.clickToSelectImages}</strong> {t.tickets.form.orDragAndDrop}
                      <span className="upload-hint">{t.tickets.form.fileTypesHint}</span>
                    </>
                  )}
                </span>
              </label>
            </div>

            {pendingFiles.length > 0 && (
              <div className="image-preview-container">
                <div className="image-preview-grid">
                  {pendingFiles.map((file, index) => (
                    <div key={index} className="image-preview-item">
                      <div className="image-preview-wrapper">
                        {file.type === 'application/pdf' ? (
                          <div className="image-preview-thumbnail pdf-preview">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            <span>PDF</span>
                          </div>
                        ) : (
                          /* Use regular img for blob URLs as Next.js Image doesn't support blob URLs */
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="image-preview-thumbnail"
                          />
                        )}
                        <button
                          type="button"
                          className="image-preview-remove"
                          onClick={() => removePendingFile(index)}
                          aria-label="Remove file"
                          disabled={uploadingImages}
                        >
                          ×
                        </button>
                      </div>
                      <div className="image-preview-info">
                        <span className="image-preview-name" title={file.name}>
                          {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                        </span>
                        <span className="image-preview-size">{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {uploadingImages && (
                  <p className="image-preview-note">
                    {t.tickets.detail.uploadingFiles.replace('{count}', pendingFiles.length.toString())}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ticket-detail__section">
          <h2>{t.common.info.financialInformation}</h2>
          <div className="ticket-detail__info-grid">
            <div>
              <label>{t.tickets.estimatedCost || 'Estimated Cost'}</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.estimatedCost || ''}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  className="ticket-detail__edit-input"
                />
              ) : (
                <p>{currentTicket.estimatedCost !== undefined ? formatCurrency(currentTicket.estimatedCost) : '-'}</p>
              )}
            </div>
            <div>
              <label>{t.tickets.actualCost || 'Actual Cost'}</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.actualCost || ''}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    actualCost: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  className="ticket-detail__edit-input"
                />
              ) : (
                <p>{currentTicket.actualCost !== undefined ? formatCurrency(currentTicket.actualCost) : '-'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="ticket-detail__section">
          <div className="ticket-detail__section-header">
            <h2>{t.tickets.detail.expenses}</h2>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setTriggerAddExpense(true)}
            >
              {t.tickets.detail.addExpense}
            </button>
          </div>
          <ExpenseTable
            ticketId={currentTicket.id}
            initialExpenses={currentTicket.expenses || []}
            onExpensesChange={(expenses: Expense[]) => {
              setUpdatedTicket({ ...currentTicket, expenses })
              if (onTicketUpdate) {
                onTicketUpdate({ ...currentTicket, expenses })
              }
            }}
            editable={true}
            showHeader={false}
            triggerAdd={triggerAddExpense}
            onAddTriggered={() => setTriggerAddExpense(false)}
          />
        </div>

        {ticket.status === 'completed' && (
          <div className="ticket-detail__section">
            <div className="ticket-detail__section-header">
              <h2>{t.warranties.title}</h2>
            </div>
            {loadingWarranty ? (
              <div className="spinner-container spinner-container--inline">
                <Spinner size="small" />
                <span>{t.warranties.loadingWarranties}</span>
              </div>
            ) : warranty ? (
              <div className="ticket-detail__warranty">
                <div className="ticket-detail__info-grid">
                  <div>
                    <label>{t.warranties.table.status}</label>
                    <p>
                      <WarrantyStatusBadge status={warranty.status} expiryDate={warranty.expiryDate} />
                    </p>
                  </div>
                  <div>
                    <label>{t.warranties.form.warrantyType}</label>
                    <p>
                      {warranty.warrantyType === 'parts' ? t.warranties.type.parts :
                       warranty.warrantyType === 'labor' ? t.warranties.type.labor :
                       t.warranties.type.both}
                    </p>
                  </div>
                  <div>
                    <label>{t.warranties.table.period}</label>
                    <p>{warranty.warrantyPeriodDays} days</p>
                  </div>
                  <div>
                    <label>{t.warranties.table.startDate}</label>
                    <p>{formatDate(warranty.startDate)}</p>
                  </div>
                  <div>
                    <label>{t.warranties.table.expiryDate}</label>
                    <p>{formatDate(warranty.expiryDate)}</p>
                  </div>
                  {warranty.warrantyClaims && warranty.warrantyClaims.length > 0 && (
                    <div>
                      <label>{t.warranties.claim.title}</label>
                      <p>{warranty.warrantyClaims.length} {warranty.warrantyClaims.length !== 1 ? t.warranties.card.claims : t.warranties.card.claim}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="ticket-detail__no-warranty">{t.warranties.noWarrantiesFound}</p>
            )}
          </div>
        )}

        <div className="ticket-detail__section">
          <h2>{t.common.info.importantDates}</h2>
          <div className="ticket-detail__info-grid">
            <div>
              <label>{t.common.dates.createdAt}</label>
              <p>{formatDateTime(currentTicket.createdAt)}</p>
            </div>
            <div>
              <label>{t.common.dates.updatedAt}</label>
              <p>{formatDateTime(currentTicket.updatedAt)}</p>
            </div>
            <div>
              <label>{t.tickets.estimatedCompletionDate || 'Estimated Completion Date'}</label>
              {isEditing ? (
                <DatePicker
                  selected={editFormData.estimatedCompletionDate ? new Date(editFormData.estimatedCompletionDate) : null}
                  onChange={(date: Date | null) => {
                    setEditFormData({
                      ...editFormData,
                      estimatedCompletionDate: date ? date.toISOString().split('T')[0] : undefined
                    })
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText={t.common.dates.selectDate}
                  className="date-picker-input"
                  wrapperClassName="date-picker-wrapper"
                />
              ) : (
                <p>{currentTicket.estimatedCompletionDate ? formatDate(currentTicket.estimatedCompletionDate) : '-'}</p>
              )}
            </div>
            <div>
              <label>{t.tickets.actualCompletionDate || 'Actual Completion Date'}</label>
              {isEditing ? (
                <DatePicker
                  selected={editFormData.actualCompletionDate ? new Date(editFormData.actualCompletionDate) : null}
                  onChange={(date: Date | null) => {
                    setEditFormData({
                      ...editFormData,
                      actualCompletionDate: date ? date.toISOString().split('T')[0] : undefined
                    })
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText={t.common.dates.selectDate}
                  className="date-picker-input"
                  wrapperClassName="date-picker-wrapper"
                />
              ) : (
                <p>{currentTicket.actualCompletionDate ? formatDate(currentTicket.actualCompletionDate) : '-'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="ticket-detail__section">
          <h2>{t.tickets.updateStatus || 'Update Status'}</h2>
          <div className="ticket-detail__status-actions">
            {(['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled'] as TicketStatus[]).map(status => (
              <button
                key={status}
                className={`btn btn-sm ${currentTicket.status === status ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleStatusChange(status)}
                disabled={isUpdating || currentTicket.status === status}
              >
                {isUpdating && currentTicket.status !== status ? (
                  <>
                    <Spinner size="small" />
                    <span>{t.common.status[status as keyof typeof t.common.status] || status}</span>
                  </>
                ) : (
                  t.common.status[status as keyof typeof t.common.status] || status
                )}
              </button>
            ))}
          </div>
        </div>

        {isEditing && (
          <div className="ticket-detail__section">
            <div className="ticket-detail__edit-priority">
              <label htmlFor="priority-edit">{t.tickets.form.priority || 'Priority'}:</label>
              <select
                id="priority-edit"
                value={editFormData.priority || 'medium'}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  priority: e.target.value as TicketPriority
                })}
                className="ticket-detail__edit-select"
              >
                <option value="low">{t.common.priority.low}</option>
                <option value="medium">{t.common.priority.medium}</option>
                <option value="high">{t.common.priority.high}</option>
                <option value="urgent">{t.common.priority.urgent}</option>
              </select>
            </div>
            <div className="ticket-detail__edit-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleEditSubmit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Spinner size="small" />
                    <span>{t.common.messages.saving}</span>
                  </>
                ) : (
                  t.common.actions.save
                )}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsEditing(false)
                  setEditFormData({
                    customerName: currentTicket.customerName,
                    customerEmail: currentTicket.customerEmail,
                    customerPhone: currentTicket.customerPhone,
                    deviceType: currentTicket.deviceType,
                    deviceBrand: currentTicket.deviceBrand || '',
                    deviceModel: currentTicket.deviceModel || '',
                    deviceSerialNumber: currentTicket.deviceSerialNumber || '',
                    issueDescription: currentTicket.issueDescription,
                    priority: currentTicket.priority,
                    estimatedCost: currentTicket.estimatedCost,
                    actualCost: currentTicket.actualCost,
                    estimatedCompletionDate: currentTicket.estimatedCompletionDate,
                    actualCompletionDate: currentTicket.actualCompletionDate,
                    notes: currentTicket.notes || '',
                  })
                }}
                disabled={isUpdating}
              >
                {t.common.actions.cancel}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        variant={confirmation.variant}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
      />
    </div>
  )
}

