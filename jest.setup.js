// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom')

const path = require('path')

try {
  const { loadEnvConfig } = require('@next/env')
  const projectDir = path.resolve(__dirname)
  // Load env files - this handles .env, .env.local, .env.test, etc. automatically
  loadEnvConfig(projectDir)
} catch (e) {
  // Fallback to dotenv if @next/env is not available
  try {
    const dotenv = require('dotenv')
    const dotenvExpand = require('dotenv-expand')
    
    const rootDir = path.resolve(__dirname)
    
    // Load .env files in order of priority (lower priority first, higher priority last)
    const envFiles = [
      path.join(rootDir, '.env'),
      path.join(rootDir, '.env.local'),
      path.join(rootDir, '.env.test'),
      path.join(rootDir, '.env.test.local'),
    ]
    
    envFiles.forEach((envFile) => {
      const result = dotenv.config({ path: envFile, override: false })
      if (result.parsed) {
        dotenvExpand.expand(result)
      }
    })
  } catch (dotenvError) {
    console.warn('Could not load environment variables:', dotenvError.message)
  }
}

// Ensure required environment variables are set with valid values for tests
// This must happen after loading .env files but before any modules are imported
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
  // Generate a test secret that's at least 32 characters
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key-for-jest-tests-minimum-32-chars'
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://localhost:3001'
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return require('react').createElement('img', props)
  },
}))

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  __esModule: true,
  default: {},
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock next-auth to prevent ES module import issues
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    handlers: {},
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
  getServerSession: jest.fn(),
  NextAuth: jest.fn(() => ({
    handlers: {},
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}))

// Mock next-auth/providers to prevent ES module import issues
jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: 'credentials',
    name: 'Credentials',
  })),
}))

// Mock Next.js server components (NextRequest, NextResponse)
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextRequest: class NextRequest {
      constructor(input, init) {
        this.url = typeof input === 'string' ? input : input?.url || 'http://localhost:3000'
        this.method = init?.method || 'GET'
        this.headers = new Headers(init?.headers)
        this.nextUrl = new URL(this.url)
        this.json = jest.fn()
        this.text = jest.fn()
        this.formData = jest.fn()
      }
    },
    NextResponse: {
      json: jest.fn((body, init) => {
        const response = new Response(JSON.stringify(body), {
          status: init?.status || 200,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        })
        response.json = jest.fn().mockResolvedValue(body)
        return response
      }),
      redirect: jest.fn((url, init) => {
        return new Response(null, {
          status: init?.status || 307,
          headers: {
            Location: url,
            ...init?.headers,
          },
        })
      }),
      next: jest.fn((init) => {
        return new Response(null, {
          status: init?.status || 200,
          headers: init?.headers,
        })
      }),
    },
  }
})

// Mock global fetch and Web APIs
global.fetch = jest.fn()

// Polyfill for TextDecoder/TextEncoder (needed for Next.js)
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(input) {
      if (typeof input === 'string') {
        return input
      }
      if (input instanceof Uint8Array) {
        return Buffer.from(input).toString('utf-8')
      }
      if (input instanceof ArrayBuffer) {
        return Buffer.from(input).toString('utf-8')
      }
      return String(input)
    }
  }
}

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(input) {
      if (typeof input === 'string') {
        return new Uint8Array(Buffer.from(input, 'utf-8'))
      }
      return new Uint8Array(0)
    }
  }
}

// Polyfill for Request/Response (needed for Next.js)
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers)
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.headers = new Headers(init?.headers)
    }
    json() {
      return Promise.resolve(JSON.parse(this.body))
    }
    text() {
      return Promise.resolve(String(this.body))
    }
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = {}
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => {
            this._headers[key.toLowerCase()] = value
          })
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => {
            this._headers[key.toLowerCase()] = value
          })
        }
      }
    }
    get(name) {
      return this._headers[name.toLowerCase()] || null
    }
    set(name, value) {
      this._headers[name.toLowerCase()] = value
    }
    has(name) {
      return name.toLowerCase() in this._headers
    }
    delete(name) {
      delete this._headers[name.toLowerCase()]
    }
  }
}

// Suppress console errors in tests unless needed
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}

