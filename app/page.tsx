'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null)

  const openModal = (src: string, alt: string) => {
    setSelectedImage({ src, alt })
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal()
    }
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedImage])
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
          <div className="landing-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <span>Repair Assistant</span>
          </div>
          <div className="landing-nav-links">
            <Link href="/login" className="landing-nav-link">Login</Link>
            <Link href="/register" className="landing-btn landing-btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="landing-hero-content">
            <h1 className="landing-hero-title">
              Streamline Your Electronics Repair Business
            </h1>
            <p className="landing-hero-subtitle">
              A comprehensive repair management system built specifically for electronics repair businesses. 
              Eliminate the chaos of spreadsheets and disconnected systems with a single, powerful platform.
            </p>
            <div className="landing-hero-cta">
              <Link href="/register" className="landing-btn landing-btn-primary landing-btn-large">
                Start Free Now
              </Link>
              <Link href="/login" className="landing-btn landing-btn-secondary landing-btn-large">
                Sign In
              </Link>
            </div>
            <div className="landing-hero-stats">
              <div className="landing-stat">
                <div className="landing-stat-number">100%</div>
                <div className="landing-stat-label">Paperless</div>
              </div>
              <div className="landing-stat">
                <div className="landing-stat-number">24/7</div>
                <div className="landing-stat-label">Access</div>
              </div>
              <div className="landing-stat">
                <div className="landing-stat-number">Multi-Language</div>
                <div className="landing-stat-label">Support</div>
              </div>
            </div>
          </div>
          <div className="landing-hero-image">
            <Image
              src="/screenshots/dashboard.png"
              alt="Repair Assistant Dashboard"
              width={1200}
              height={800}
              priority
              className="landing-screenshot"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-features">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Everything You Need to Run Your Repair Shop</h2>
            <p className="landing-section-subtitle">
              Every feature is tailored to the unique needs of electronics repair shops
            </p>
          </div>
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                  <path d="M12 21c0-1-1-3-3-3s-3 2-3 3 1 3 3 3 3-2 3-3"/>
                  <path d="M12 3c0 1-1 3-3 3S6 5 6 4s1-3 3-3 3 2 3 3"/>
                </svg>
              </div>
              <h3 className="landing-feature-title">Repair Ticket Management</h3>
              <p className="landing-feature-description">
                Create and track repair tickets with full device details, status tracking, priority levels, 
                and comprehensive notes. Never lose track of a repair again.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="landing-feature-title">Expense & Profit Tracking</h3>
              <p className="landing-feature-description">
                Track parts and labor expenses per repair ticket with automatic profit calculations. 
                Get detailed expense breakdowns and understand your true profit margins.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <h3 className="landing-feature-title">Documentation & Images</h3>
              <p className="landing-feature-description">
                Upload multiple images per repair ticket, store PDF documents, and maintain secure 
                cloud storage for all attachments. Document everything.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="landing-feature-title">Customer Management</h3>
              <p className="landing-feature-description">
                Complete customer database with contact information, repair history tracking, 
                quick search, and relationship management for repeat customers.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <h3 className="landing-feature-title">Business Analytics</h3>
              <p className="landing-feature-description">
                Real-time statistics, financial overview, profit margins, and trend analysis with 
                customizable time periods. Visual charts for income, expenses, and profit over time.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h3 className="landing-feature-title">Professional Reports</h3>
              <p className="landing-feature-description">
                Generate professional PDF invoices with your store branding, business reports with 
                financial summaries, and customizable store information.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <h3 className="landing-feature-title">Warranties Management</h3>
              <p className="landing-feature-description">
                Track warranty periods for all repairs, manage warranty claims, set expiration alerts, 
                and maintain comprehensive warranty records for customer satisfaction.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="landing-feature-title">Team Management</h3>
              <p className="landing-feature-description">
                Invite team members, manage roles and permissions, track user activity, and control access 
                levels. Built-in role-based access control for admins, managers, technicians, and viewers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="landing-screenshots">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">See Repair Assistant in Action</h2>
            <p className="landing-section-subtitle">
              Explore the key features and user interface of Repair Assistant
            </p>
          </div>
          <div className="landing-screenshots-grid">
            <div className="landing-screenshot-card">
              <div 
                className="landing-screenshot-img-wrapper"
                onClick={() => openModal('/screenshots/dashboard.png', 'Dashboard - Real-time statistics and business analytics')}
              >
                <Image
                  src="/screenshots/dashboard.png"
                  alt="Dashboard - Real-time statistics and business analytics"
                  width={800}
                  height={600}
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-caption">
                <h3>Dashboard</h3>
                <p>Real-time statistics, financial overview, and business analytics at a glance</p>
              </div>
            </div>
            <div className="landing-screenshot-card">
              <div 
                className="landing-screenshot-img-wrapper"
                onClick={() => openModal('/screenshots/tickets-list.png', 'Repair Tickets - Manage all your repair tickets')}
              >
                <Image
                  src="/screenshots/tickets-list.png"
                  alt="Repair Tickets - Manage all your repair tickets"
                  width={800}
                  height={600}
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-caption">
                <h3>Repair Tickets</h3>
                <p>Manage all your repair tickets with detailed tracking and status updates</p>
              </div>
            </div>
            <div className="landing-screenshot-card">
              <div 
                className="landing-screenshot-img-wrapper"
                onClick={() => openModal('/screenshots/ticket-detail.png', 'Ticket Details - Comprehensive ticket information')}
              >
                <Image
                  src="/screenshots/ticket-detail.png"
                  alt="Ticket Details - Comprehensive ticket information"
                  width={800}
                  height={600}
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-caption">
                <h3>Ticket Details</h3>
                <p>View comprehensive ticket information including expenses and invoices</p>
              </div>
            </div>
            <div className="landing-screenshot-card">
              <div 
                className="landing-screenshot-img-wrapper"
                onClick={() => openModal('/screenshots/customers.png', 'Customers - Manage your customer database')}
              >
                <Image
                  src="/screenshots/customers.png"
                  alt="Customers - Manage your customer database"
                  width={800}
                  height={600}
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-caption">
                <h3>Customers</h3>
                <p>Manage your customer database with search and complete repair history</p>
              </div>
            </div>
            <div className="landing-screenshot-card">
              <div 
                className="landing-screenshot-img-wrapper"
                onClick={() => openModal('/screenshots/inventory.png', 'Inventory - Track parts and components')}
              >
                <Image
                  src="/screenshots/inventory.png"
                  alt="Inventory - Track parts and components"
                  width={800}
                  height={600}
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-caption">
                <h3>Inventory</h3>
                <p>Track parts and components with detailed inventory management</p>
              </div>
            </div>
            <div className="landing-screenshot-card">
              <div 
                className="landing-screenshot-img-wrapper"
                onClick={() => openModal('/screenshots/reports.png', 'Reports - Generate professional PDF reports')}
              >
                <Image
                  src="/screenshots/reports.png"
                  alt="Reports - Generate professional PDF reports"
                  width={800}
                  height={600}
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-caption">
                <h3>Reports</h3>
                <p>Generate professional PDF reports and invoices with customizable branding</p>
              </div>
            </div>
            <div className="landing-screenshot-card">
              <div 
                className="landing-screenshot-img-wrapper"
                onClick={() => openModal('/screenshots/settings.png', 'Settings - Customize your store profile')}
              >
                <Image
                  src="/screenshots/settings.png"
                  alt="Settings - Customize your store profile"
                  width={800}
                  height={600}
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-caption">
                <h3>Settings</h3>
                <p>Customize your store profile, branding, and application settings</p>
              </div>
            </div>
            <div className="landing-screenshot-card">
              <div 
                className="landing-screenshot-img-wrapper"
                onClick={() => openModal('/screenshots/warranties.png', 'Warranties - Manage warranty periods and claims')}
              >
                <Image
                  src="/screenshots/warranties.png"
                  alt="Warranties - Manage warranty periods and claims"
                  width={800}
                  height={600}
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-caption">
                <h3>Warranties</h3>
                <p>Track warranty periods, manage claims, and set expiration alerts for all repairs</p>
              </div>
            </div>
            <div className="landing-screenshot-card">
              <div 
                className="landing-screenshot-img-wrapper"
                onClick={() => openModal('/screenshots/team-management.png', 'Team Management - Invite and manage team members')}
              >
                <Image
                  src="/screenshots/team-management.png"
                  alt="Team Management - Invite and manage team members"
                  width={800}
                  height={600}
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-caption">
                <h3>Team Management</h3>
                <p>Invite team members, manage roles and permissions, and control access levels</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="landing-usecases">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Perfect For</h2>
            <p className="landing-section-subtitle">
              Built specifically for electronics repair businesses of all sizes
            </p>
          </div>
          <div className="landing-usecases-grid">
            <div className="landing-usecase-item">
              <div className="landing-usecase-icon">📱</div>
              <h3>Smartphone Repair Shops</h3>
            </div>
            <div className="landing-usecase-item">
              <div className="landing-usecase-icon">💻</div>
              <h3>Laptop & Computer Repair</h3>
            </div>
            <div className="landing-usecase-item">
              <div className="landing-usecase-icon">📱</div>
              <h3>Tablet & iPad Repair</h3>
            </div>
            <div className="landing-usecase-item">
              <div className="landing-usecase-icon">🎮</div>
              <h3>Gaming Console Repair</h3>
            </div>
            <div className="landing-usecase-item">
              <div className="landing-usecase-icon">🏪</div>
              <h3>Repair Franchises</h3>
            </div>
            <div className="landing-usecase-item">
              <div className="landing-usecase-icon">🔧</div>
              <h3>Independent Technicians</h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta-content">
            <h2 className="landing-cta-title">Ready to Streamline Your Repair Business?</h2>
            <p className="landing-cta-subtitle">
              Join repair shops worldwide who have eliminated the chaos of spreadsheets and disconnected systems.
              Get started today.
            </p>
            <div className="landing-cta-buttons">
              <Link href="/register" className="landing-btn landing-btn-primary landing-btn-large">
                Start Free Now
              </Link>
              <Link href="/login" className="landing-btn landing-btn-secondary landing-btn-large">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-content">
            <div className="landing-footer-section">
              <div className="landing-logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <span>Repair Assistant</span>
              </div>
              <p className="landing-footer-description">
                Streamline your repair business operations with a comprehensive management system 
                built specifically for electronics repair shops.
              </p>
            </div>
            <div className="landing-footer-section">
              <h4 className="landing-footer-title">Product</h4>
              <ul className="landing-footer-links">
                <li><Link href="/register">Get Started</Link></li>
                <li><Link href="/login">Sign In</Link></li>
              </ul>
            </div>
            <div className="landing-footer-section">
              <h4 className="landing-footer-title">Features</h4>
              <ul className="landing-footer-links">
                <li><a href="#features">Repair Tickets</a></li>
                <li><a href="#features">Customer Management</a></li>
                <li><a href="#features">Inventory Tracking</a></li>
                <li><a href="#features">Business Analytics</a></li>
                <li><a href="#features">Reports & Invoicing</a></li>
              </ul>
            </div>
            <div className="landing-footer-section">
              <h4 className="landing-footer-title">Support</h4>
              <ul className="landing-footer-links">
                <li>Multi-Language</li>
                <li>24/7 Access</li>
                <li>Cloud Storage</li>
              </ul>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <p>&copy; {new Date().getFullYear()} Repair Assistant. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="landing-image-modal"
          onClick={closeModal}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview"
          tabIndex={-1}
        >
          <button
            className="landing-image-modal-close"
            onClick={closeModal}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
          <div className="landing-image-modal-content" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage.src}
              alt={selectedImage.alt}
              width={1200}
              height={900}
              className="landing-image-modal-img"
            />
          </div>
        </div>
      )}
    </div>
  )
}
