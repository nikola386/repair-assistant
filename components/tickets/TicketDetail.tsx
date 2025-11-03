'use client'

import { useState, useRef, useEffect, DragEvent } from 'react'
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

interface TicketDetailProps {
  ticket: RepairTicket
  onTicketUpdate?: (ticket: RepairTicket) => void
}

export default function TicketDetail({ ticket, onTicketUpdate }: TicketDetailProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]) // Files selected before upload
  const [updatedTicket, setUpdatedTicket] = useState<RepairTicket>(ticket)
  const [triggerAddExpense, setTriggerAddExpense] = useState(false)
  const [editFormData, setEditFormData] = useState<UpdateTicketInput>({
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    customerPhone: ticket.customerPhone,
    deviceType: ticket.deviceType,
    deviceBrand: ticket.deviceBrand || '',
    deviceModel: ticket.deviceModel || '',
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

  // Update local state when ticket prop changes
  useEffect(() => {
    setUpdatedTicket(ticket)
    setEditFormData({
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      customerPhone: ticket.customerPhone,
      deviceType: ticket.deviceType,
      deviceBrand: ticket.deviceBrand || '',
      deviceModel: ticket.deviceModel || '',
      issueDescription: ticket.issueDescription,
      priority: ticket.priority,
      estimatedCost: ticket.estimatedCost,
      actualCost: ticket.actualCost,
      estimatedCompletionDate: ticket.estimatedCompletionDate,
      actualCompletionDate: ticket.actualCompletionDate,
      notes: ticket.notes || '',
    })
  }, [ticket])

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
        setUpdatedTicket(data.ticket)
        if (newStatus === 'completed') {
          // Auto-set completion date if not set
          const completionResponse = await fetch(`/api/tickets/${ticket.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              actualCompletionDate: new Date().toISOString().split('T')[0]
            }),
          })
          if (completionResponse.ok) {
            const completionData = await completionResponse.json()
            setUpdatedTicket(completionData.ticket)
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
    
    // Validate required fields
    if (!editFormData.customerName || !editFormData.customerEmail || !editFormData.customerPhone || 
        !editFormData.deviceType || !editFormData.issueDescription) {
      showAlert.error('Please fill in all required fields (Customer Name, Email, Phone, Device Type, and Issue Description)')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editFormData.customerEmail || '')) {
      showAlert.error('Please enter a valid email address')
      return
    }

    await handleUpdate(editFormData)
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    // Store files for preview first (so user can see and remove them)
    const newFiles = Array.from(files)
    setPendingFiles((prev) => [...prev, ...newFiles])

    // Upload files immediately (since ticket already exists)
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
      
      // Remove successfully uploaded files from pending list
      const uploadedFiles = results.map((r) => r.file)
      setPendingFiles((prev) => prev.filter((file) => !uploadedFiles.includes(file)))
      
      // Refresh ticket to get updated images
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
      // Remove failed files from pending
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
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      const response = await fetch(`/api/tickets/images?imageId=${imageId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh ticket to get updated images
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
      showAlert.error('Failed to delete image')
    }
  }

  const handleDelete = async () => {
    if (!confirm(t.tickets.confirmDelete)) {
      return
    }

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
  
  // Generate the full URL for the ticket details page
  const [ticketUrl, setTicketUrl] = useState<string>('')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/tickets/${currentTicket.id}`
      setTicketUrl(url)
    }
  }, [currentTicket.id])

  const handlePrintQR = () => {
    if (!ticketUrl || !qrCodeRef.current) return
    
    // Create a new window with only the QR code
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Get the QR code SVG
    const qrSvg = qrCodeRef.current.querySelector('svg')
    if (!qrSvg) return

    const qrSvgContent = qrSvg.outerHTML

    // Create print-friendly HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${currentTicket.ticketNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 2rem;
            }
            .qr-print-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1rem;
              padding: 2rem;
              border: 2px solid #000;
              background: white;
            }
            .qr-print-code {
              background: white;
              padding: 1rem;
              border: 1px solid #000;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg {
              display: block;
            }
            .qr-print-ticket {
              font-size: 1rem;
              font-weight: bold;
              text-align: center;
            }
            @media print {
              body {
                padding: 0;
              }
              .qr-print-container {
                border: none;
                padding: 1rem;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-print-container">
            <div class="qr-print-ticket">Ticket: ${currentTicket.ticketNumber}</div>
            <div class="qr-print-code">
              ${qrSvgContent}
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        // Close window after printing (with delay to allow print dialog to open)
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

      // Create blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${ticket.ticketNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
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
                {t.tickets.status[currentTicket.status]}
              </span>
              <span className={`ticket-priority ticket-priority--${currentTicket.priority}`}>
                {t.tickets.priority[currentTicket.priority]}
              </span>
            </div>
          </div>
          <div className="ticket-detail__actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadInvoice}
              disabled={isDownloadingInvoice}
            >
              {isDownloadingInvoice ? (
                <>
                  <Spinner size="small" />
                  <span>Generating...</span>
                </>
              ) : (
                'Download Invoice'
              )}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isUpdating}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Ticket'}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner size="small" />
                  <span>Deleting...</span>
                </>
              ) : (
                t.tickets.delete || 'Delete'
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
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 120 120`}
                />
              </div>
              <button
                className="btn btn-secondary btn-sm ticket-detail__qr-print"
                onClick={handlePrintQR}
              >
                {(t.tickets as any).printQr || 'Print QR Code'}
              </button>
            </div>
          </div>
        )}

        <div className="ticket-detail__section">
          <h2>{t.tickets.customerInfo || 'Customer Information'}</h2>
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
          <h2>{t.tickets.deviceInfo || 'Device Information'}</h2>
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
          <h2>Files</h2>
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
                        className="ticket-detail__image"
                        style={{ objectFit: 'cover' }}
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
              <p className="ticket-detail__no-images">No files uploaded yet</p>
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
                    <>Uploading images...</>
                  ) : (
                    <>
                      <strong>Click to select images</strong> or drag and drop
                      <span className="upload-hint">PNG, JPG, GIF, PDF up to 2MB</span>
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
                    Uploading {pendingFiles.length} file(s)...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ticket-detail__section">
          <h2>{t.tickets.financialInfo || 'Financial Information'}</h2>
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
                <p>{currentTicket.estimatedCost !== undefined ? `$${currentTicket.estimatedCost.toFixed(2)}` : '-'}</p>
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
                <p>{currentTicket.actualCost !== undefined ? `$${currentTicket.actualCost.toFixed(2)}` : '-'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="ticket-detail__section">
          <div className="ticket-detail__section-header">
            <h2>Expenses</h2>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setTriggerAddExpense(true)}
            >
              + Add Expense
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

        <div className="ticket-detail__section">
          <h2>{t.tickets.dates}</h2>
          <div className="ticket-detail__info-grid">
            <div>
              <label>{t.tickets.createdAt}</label>
              <p>{formatDateTime(currentTicket.createdAt)}</p>
            </div>
            <div>
              <label>{t.tickets.updatedAt}</label>
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
                  placeholderText="Select a date"
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
                  placeholderText="Select a date"
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
                    <span>{t.tickets.status?.[status] || status}</span>
                  </>
                ) : (
                  t.tickets.status?.[status] || status
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
                <option value="low">{t.tickets.priority?.low || 'Low'}</option>
                <option value="medium">{t.tickets.priority?.medium || 'Medium'}</option>
                <option value="high">{t.tickets.priority?.high || 'High'}</option>
                <option value="urgent">{t.tickets.priority?.urgent || 'Urgent'}</option>
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
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save Changes'
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
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

