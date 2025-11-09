# Test Suite Documentation

This directory contains comprehensive unit and integration tests for the Repair Assistant application.

## Test Structure

```
__tests__/
├── unit/                    # Unit tests
│   ├── api/                 # API route tests
│   │   ├── tickets/
│   │   ├── customers/
│   │   ├── users/
│   │   ├── warranties/
│   │   └── inventory/
│   └── components/          # React component tests
│       ├── tickets/
│       └── ui/
├── integration/             # Integration tests
│   ├── api/                 # API integration tests
│   └── components/          # Component integration tests
└── utils/                   # Test utilities and helpers
    ├── test-helpers.ts      # Helper functions for creating mocks
    └── mocks.ts             # Shared mocks
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run only unit tests
```bash
npm run test:unit
```

### Run only integration tests
```bash
npm run test:integration
```

## Test Coverage

The test suite aims for:
- **70% minimum coverage** for branches, functions, lines, and statements
- **Unit tests** for all API routes and React components
- **Integration tests** for critical user flows

## Writing Tests

### Unit Tests

Unit tests should:
- Test individual functions/components in isolation
- Mock all external dependencies
- Be fast and deterministic
- Cover edge cases and error scenarios

Example:
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Integration Tests

Integration tests should:
- Test multiple components/APIs working together
- Verify real user flows
- Test API interactions
- Use realistic data

Example:
```typescript
describe('Ticket Creation Flow', () => {
  it('should create ticket and retrieve it', async () => {
    // Create ticket
    // Retrieve ticket
    // Verify data
  })
})
```

## Test Utilities

### `test-helpers.ts`

Provides helper functions for creating mock data:
- `createMockSession()` - Creates a mock NextAuth session
- `createMockUser()` - Creates a mock user object
- `createMockTicket()` - Creates a mock ticket object
- `createMockNextRequest()` - Creates a mock Next.js request
- `createMockNextResponse()` - Creates a mock Next.js response

### `mocks.ts`

Provides shared mocks for:
- Prisma Client
- Auth functions
- Storage functions
- Logger
- Email service

## Mocking Guidelines

1. **Always mock external dependencies** (database, APIs, file system)
2. **Use shared mocks** from `__tests__/utils/mocks.ts` when possible
3. **Reset mocks** in `beforeEach` hooks
4. **Use realistic mock data** that matches your schema

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Use descriptive test names** - Test names should clearly describe what they test
3. **Arrange-Act-Assert pattern** - Structure tests clearly
4. **One assertion per test** - When possible, test one thing at a time
5. **Test error cases** - Don't just test happy paths
6. **Keep tests independent** - Tests should not depend on each other

## Common Patterns

### Testing API Routes

```typescript
describe('/api/endpoint', () => {
  it('should return data successfully', async () => {
    // Mock dependencies
    mockStorage.get.mockResolvedValue(mockData)
    
    // Make request
    const response = await GET(request)
    const data = await response.json()
    
    // Assert
    expect(response.status).toBe(200)
    expect(data).toBeDefined()
  })
})
```

### Testing React Components

```typescript
describe('Component', () => {
  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<Component />)
    
    await user.click(screen.getByRole('button'))
    
    expect(mockHandler).toHaveBeenCalled()
  })
})
```

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check that mocks are properly set up

### Tests timing out
- Check for unhandled promises
- Use `waitFor` for async operations
- Increase timeout if needed: `jest.setTimeout(10000)`

### Coverage not meeting threshold
- Add tests for uncovered code paths
- Check that all branches are tested
- Review edge cases

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Before deployments

All tests must pass before code can be merged.

