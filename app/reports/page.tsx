'use client'

import { useState } from 'react'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import Spinner from '@/components/ui/Spinner'
import { showAlert } from '@/lib/alerts'
import { HiDocumentReport, HiCalendar } from 'react-icons/hi'

export default function ReportsPage() {
  const { t } = useLanguage()
  const [isGeneratingBusinessReport, setIsGeneratingBusinessReport] = useState(false)
  const [isGeneratingInventoryReport, setIsGeneratingInventoryReport] = useState(false)
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30) // Default to last 30 days
    return date
  })
  const [endDate, setEndDate] = useState<Date>(new Date())

  const handleGenerateBusinessReport = async () => {
    if (!startDate || !endDate) {
      showAlert.error('Please select both start and end dates')
      return
    }

    if (startDate > endDate) {
      showAlert.error('Start date must be before end date')
      return
    }

    setIsGeneratingBusinessReport(true)
    try {
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]
      
      const response = await fetch(`/api/reports/business?startDate=${startDateStr}&endDate=${endDateStr}`)
      if (!response.ok) {
        throw new Error('Failed to generate business report')
      }

      // Create blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `business-report-${startDateStr}-to-${endDateStr}.pdf`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      showAlert.success('Business report downloaded successfully')
    } catch (error) {
      console.error('Error generating business report:', error)
      showAlert.error('Failed to generate business report')
    } finally {
      setIsGeneratingBusinessReport(false)
    }
  }

  const handleQuickPeriod = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start)
    setEndDate(end)
  }

  const handleGenerateInventoryReport = async () => {
    if (!startDate || !endDate) {
      showAlert.error('Please select both start and end dates')
      return
    }

    if (startDate > endDate) {
      showAlert.error('Start date must be before end date')
      return
    }

    setIsGeneratingInventoryReport(true)
    try {
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]
      
      const response = await fetch(`/api/reports/inventory?startDate=${startDateStr}&endDate=${endDateStr}`)
      if (!response.ok) {
        throw new Error('Failed to generate inventory report')
      }

      // Create blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `inventory-report-${startDateStr}-to-${endDateStr}.pdf`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      showAlert.success('Inventory report downloaded successfully')
    } catch (error) {
      console.error('Error generating inventory report:', error)
      showAlert.error('Failed to generate inventory report')
    } finally {
      setIsGeneratingInventoryReport(false)
    }
  }

  return (
    <>
      <Navigation />
      <main className="reports-page">
        <div className="container">
          <div className="reports-page__header">
            <h1>{t.reports?.title || 'Reports'}</h1>
            <p className="reports-page__subtitle">
              Generate printable PDF reports for your repair business
            </p>
          </div>
          
          <div className="reports-page__content">
            {/* Business Report Section */}
            <div className="report-card">
              <div className="report-card__header">
                <HiDocumentReport className="report-card__icon" />
                <div>
                  <h2 className="report-card__title">Monthly/Period Business Report</h2>
                  <p className="report-card__description">
                    Comprehensive business performance report with statistics, revenue breakdown, and customer analytics
                  </p>
                </div>
              </div>

              <div className="report-card__body">
                <div className="report-card__section">
                  <label className="report-card__label">
                    <HiCalendar className="report-card__label-icon" />
                    Select Date Range
                  </label>
                  <div className="report-card__date-range">
                    <div className="report-card__date-input">
                      <label>Start Date</label>
                      <DatePicker
                        selected={startDate}
                        onChange={(date: Date | null) => date && setStartDate(date)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select start date"
                        className="date-picker-input"
                        wrapperClassName="date-picker-wrapper"
                        maxDate={endDate}
                      />
                    </div>
                    <div className="report-card__date-input">
                      <label>End Date</label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date: Date | null) => date && setEndDate(date)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select end date"
                        className="date-picker-input"
                        wrapperClassName="date-picker-wrapper"
                        minDate={startDate}
                        maxDate={new Date()}
                      />
                    </div>
                  </div>
                  
                  <div className="report-card__quick-periods">
                    <span className="report-card__quick-label">Quick Select:</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleQuickPeriod(7)}
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleQuickPeriod(30)}
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleQuickPeriod(90)}
                    >
                      Last 90 Days
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleQuickPeriod(365)}
                    >
                      Last Year
                    </button>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleGenerateBusinessReport}
                  disabled={isGeneratingBusinessReport || !startDate || !endDate}
                >
                  {isGeneratingBusinessReport ? (
                    <>
                      <Spinner size="small" />
                      <span>Generating Report...</span>
                    </>
                  ) : (
                    <>
                      <HiDocumentReport />
                      <span>Generate Business Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Inventory Report Section */}
            <div className="report-card">
              <div className="report-card__header">
                <HiDocumentReport className="report-card__icon" />
                <div>
                  <h2 className="report-card__title">Inventory Report</h2>
                  <p className="report-card__description">
                    View inventory value, turnover metrics, low stock items, and category breakdown
                  </p>
                </div>
              </div>

              <div className="report-card__body">
                <div className="report-card__section">
                  <label className="report-card__label">
                    <HiCalendar className="report-card__label-icon" />
                    Select Date Range (for turnover analysis)
                  </label>
                  <div className="report-card__date-range">
                    <div className="report-card__date-input">
                      <label>Start Date</label>
                      <DatePicker
                        selected={startDate}
                        onChange={(date: Date | null) => date && setStartDate(date)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select start date"
                        className="date-picker-input"
                        wrapperClassName="date-picker-wrapper"
                        maxDate={endDate}
                      />
                    </div>
                    <div className="report-card__date-input">
                      <label>End Date</label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date: Date | null) => date && setEndDate(date)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select end date"
                        className="date-picker-input"
                        wrapperClassName="date-picker-wrapper"
                        minDate={startDate}
                        maxDate={new Date()}
                      />
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleGenerateInventoryReport}
                  disabled={isGeneratingInventoryReport || !startDate || !endDate}
                >
                  {isGeneratingInventoryReport ? (
                    <>
                      <Spinner size="small" />
                      <span>Generating Report...</span>
                    </>
                  ) : (
                    <>
                      <HiDocumentReport />
                      <span>Generate Inventory Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

