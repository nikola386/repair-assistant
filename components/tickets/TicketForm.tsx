'use client'

import { useState, FormEvent, useRef, DragEvent, useEffect } from 'react'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useLanguage } from '../../contexts/LanguageContext'
import { CreateTicketInput, TicketPriority } from '../../types/ticket'
import ExpenseTable from './ExpenseTable'
import { showAlert } from '../../lib/alerts'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
}

interface TicketFormProps {
  onSubmit: (data: CreateTicketInput) => Promise<string | undefined> // Returns ticket ID after creation
  onCancel?: () => void
  initialData?: Partial<CreateTicketInput>
  ticketId?: string // For uploading images after ticket creation
}

export default function TicketForm({ onSubmit, onCancel, initialData, ticketId }: TicketFormProps) {
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]) // Files selected before ticket creation
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Customer autocomplete state
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const customerPhoneRef = useRef<HTMLInputElement>(null)
  const customerNameRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState<CreateTicketInput>({
    customerName: initialData?.customerName || '',
    customerEmail: initialData?.customerEmail || '',
    customerPhone: initialData?.customerPhone || '',
    deviceType: initialData?.deviceType || '',
    deviceBrand: initialData?.deviceBrand || '',
    deviceModel: initialData?.deviceModel || '',
    issueDescription: initialData?.issueDescription || '',
    priority: initialData?.priority || 'medium',
    estimatedCost: initialData?.estimatedCost,
    estimatedCompletionDate: initialData?.estimatedCompletionDate,
    notes: initialData?.notes || '',
  })

  const handleImageUpload = async (files: FileList | null, targetTicketId?: string) => {
    if (!files || files.length === 0) return

    const currentTicketId = targetTicketId || ticketId
    
    // If ticketId is not provided (new ticket), store files to upload after ticket creation
    if (!currentTicketId) {
      // Store files for later upload after ticket creation
      setPendingFiles((prev) => [...prev, ...Array.from(files)])
      return
    }

    setUploadingImages(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('ticketId', currentTicketId)

        const response = await fetch('/api/tickets/images', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to upload image')
        }

        const data = await response.json()
        return data.image.filePath
      })

      const uploadedPaths = await Promise.all(uploadPromises)
      setUploadedImages((prev) => [...prev, ...uploadedPaths])
    } catch (error) {
      console.error('Error uploading images:', error)
      showAlert.error('Failed to upload some images')
    } finally {
      setUploadingImages(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const uploadPendingImages = async (newTicketId: string) => {
    if (pendingFiles.length === 0) return

    setUploadingImages(true)
    try {
      const uploadPromises = pendingFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('ticketId', newTicketId)

        const response = await fetch('/api/tickets/images', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to upload image')
        }

        const data = await response.json()
        return data.image.filePath
      })

      const uploadedPaths = await Promise.all(uploadPromises)
      setUploadedImages((prev) => [...prev, ...uploadedPaths])
      setPendingFiles([]) // Clear pending files after successful upload
    } catch (error) {
      console.error('Error uploading pending images:', error)
      showAlert.error('Failed to upload some images')
    } finally {
      setUploadingImages(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || 
        !formData.deviceType || !formData.issueDescription) {
      showAlert.error(t.common.messages.required)
      return
    }

    setIsSubmitting(true)
    try {
      // Create ticket first and get the ticket ID
      const newTicketId = await onSubmit(formData)
      
      // If there are pending files and we got a ticket ID, upload them
      if (newTicketId && pendingFiles.length > 0) {
        await uploadPendingImages(newTicketId)
      }
      
      // Reset form after successful submission
      if (!initialData) {
        setFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          deviceType: '',
          deviceBrand: '',
          deviceModel: '',
          issueDescription: '',
          priority: 'medium',
          estimatedCost: undefined,
          estimatedCompletionDate: undefined,
          notes: '',
        })
        setUploadedImages([])
        setPendingFiles([])
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      console.error('Form submission error:', error)
      showAlert.error(t.tickets.form.error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Debounced customer search
  useEffect(() => {
    const searchQuery = formData.customerPhone.trim() || formData.customerName.trim()
    
    if (!searchQuery || searchQuery.length < 2) {
      setCustomerSearchResults([])
      setShowCustomerDropdown(false)
      return
    }

    if (selectedCustomerId) {
      // Don't search if a customer is already selected
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingCustomers(true)
      try {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
        if (response.ok) {
          const data = await response.json()
          setCustomerSearchResults(data.customers || [])
          setShowCustomerDropdown(data.customers && data.customers.length > 0)
        }
      } catch (error) {
        console.error('Error searching customers:', error)
        setCustomerSearchResults([])
        setShowCustomerDropdown(false)
      } finally {
        setIsSearchingCustomers(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [formData.customerPhone, formData.customerName, selectedCustomerId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        customerPhoneRef.current &&
        !customerPhoneRef.current.contains(event.target as Node) &&
        customerNameRef.current &&
        !customerNameRef.current.contains(event.target as Node)
      ) {
        setShowCustomerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCustomerSelect = (customer: Customer) => {
    setFormData((prev) => ({
      ...prev,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
    }))
    setSelectedCustomerId(customer.id)
    setShowCustomerDropdown(false)
    setCustomerSearchResults([])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Reset selected customer if user manually changes phone or name
    if (name === 'customerPhone' || name === 'customerName') {
      setSelectedCustomerId(null)
    }
    
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'estimatedCost' ? (value ? parseFloat(value) : undefined) : value
    }))
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploadingImages && !isSubmitting) {
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
    
    if (uploadingImages || isSubmitting) return
    
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

  return (
    <form className="ticket-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group" style={{ position: 'relative' }}>
          <label htmlFor="customerName">{t.tickets.form.customerName} *</label>
          <input
            ref={customerNameRef}
            type="text"
            id="customerName"
            name="customerName"
            value={formData.customerName}
            onChange={handleInputChange}
            onFocus={() => {
              if (customerSearchResults.length > 0) {
                setShowCustomerDropdown(true)
              }
            }}
            placeholder={t.tickets.form.searchCustomersPlaceholder}
            required
          />
          {isSearchingCustomers && (
            <div style={{ position: 'absolute', right: '10px', top: '42px', fontSize: '12px', color: '#666' }}>
              {t.common.messages.searching}
            </div>
          )}
        </div>
        <div className="form-group" style={{ position: 'relative' }}>
          <label htmlFor="customerPhone">{t.tickets.form.customerPhone} *</label>
          <input
            ref={customerPhoneRef}
            type="tel"
            id="customerPhone"
            name="customerPhone"
            value={formData.customerPhone}
            onChange={handleInputChange}
            onFocus={() => {
              if (customerSearchResults.length > 0) {
                setShowCustomerDropdown(true)
              }
            }}
            placeholder={t.tickets.form.searchCustomersPlaceholder}
            required
          />
          {showCustomerDropdown && customerSearchResults.length > 0 && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto',
                marginTop: '4px',
              }}
            >
              {customerSearchResults.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                  }}
                >
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{customer.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {customer.phone} • {customer.email}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="customerEmail">{t.tickets.form.customerEmail} *</label>
          <input
            type="email"
            id="customerEmail"
            name="customerEmail"
            value={formData.customerEmail}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="priority">{t.common.fields.priority}</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleInputChange}
          >
            <option value="low">{t.common.priority.low}</option>
            <option value="medium">{t.common.priority.medium}</option>
            <option value="high">{t.common.priority.high}</option>
            <option value="urgent">{t.common.priority.urgent}</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="deviceType">{t.tickets.form.deviceType} *</label>
          <input
            type="text"
            id="deviceType"
            name="deviceType"
            placeholder={t.tickets.form.deviceTypePlaceholder}
            value={formData.deviceType}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="deviceBrand">{t.tickets.form.deviceBrand}</label>
          <input
            type="text"
            id="deviceBrand"
            name="deviceBrand"
            value={formData.deviceBrand}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="deviceModel">{t.tickets.form.deviceModel}</label>
          <input
            type="text"
            id="deviceModel"
            name="deviceModel"
            value={formData.deviceModel}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="estimatedCost">{t.tickets.form.estimatedCost}</label>
          <input
            type="number"
            id="estimatedCost"
            name="estimatedCost"
            min="0"
            step="0.01"
            value={formData.estimatedCost || ''}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="estimatedCompletionDate">{t.tickets.form.estimatedCompletionDate}</label>
        <DatePicker
          id="estimatedCompletionDate"
          selected={formData.estimatedCompletionDate ? new Date(formData.estimatedCompletionDate) : null}
          onChange={(date: Date | null) => {
            setFormData((prev) => ({
              ...prev,
              estimatedCompletionDate: date ? date.toISOString().split('T')[0] : undefined
            }))
          }}
          dateFormat="yyyy-MM-dd"
          placeholderText={t.common.dates.selectDate}
          className="date-picker-input"
          wrapperClassName="date-picker-wrapper"
        />
      </div>

      <div className="form-group">
        <label htmlFor="issueDescription">{t.tickets.form.issueDescription} *</label>
        <textarea
          id="issueDescription"
          name="issueDescription"
          rows={5}
          value={formData.issueDescription}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">{t.tickets.form.notes}</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleInputChange}
        />
      </div>

      <div className="form-group">
        <label>{t.tickets.form.uploadFiles}</label>
        <div
          className={`image-upload-area ${isDragging ? 'drag-over' : ''} ${uploadingImages ? 'uploading' : ''} ${isSubmitting ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="images"
            name="images"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileSelect}
            disabled={uploadingImages || isSubmitting}
            className="image-upload-input"
          />
          <label htmlFor="images" className="image-upload-label">
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
                  <strong>{t.tickets.form.clickToUpload}</strong> {t.tickets.form.orDragAndDrop}
                  <span className="upload-hint">{t.tickets.form.fileTypesHint}</span>
                </>
              )}
            </span>
          </label>
        </div>

        {(pendingFiles.length > 0 || uploadedImages.length > 0) && (
          <div className="image-preview-container">
            {pendingFiles.length > 0 && (
              <>
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
                <p className="image-preview-note">
                  {t.tickets.form.filesWillUploadAfter.replace('{count}', pendingFiles.length.toString())}
                </p>
              </>
            )}
            {uploadedImages.length > 0 && ticketId && (
              <div className="image-upload-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{t.tickets.form.successfullyUploaded.replace('{count}', uploadedImages.length.toString())}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {ticketId && (
        <div className="form-group">
          <ExpenseTable
            ticketId={ticketId}
            initialExpenses={[]}
            editable={true}
          />
        </div>
      )}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            {t.common.actions.cancel}
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
          {isSubmitting ? t.common.messages.creating : t.common.actions.create}
        </button>
      </div>
    </form>
  )
}

