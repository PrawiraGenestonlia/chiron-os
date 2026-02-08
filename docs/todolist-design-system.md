# TodoList Application - Design System

**Version:** 1.0
**Last Updated:** 2026-02-08
**Designer:** PD-1

## Overview

This design system defines the visual language, interaction patterns, and component specifications for the TodoList application. The system is built on Tailwind CSS and follows accessibility best practices (WCAG 2.1 AA compliance).

## Design Principles

1. **Simplicity First** - Clean, minimal interface focused on task completion
2. **Accessibility by Default** - All interactions keyboard-accessible with visible focus indicators
3. **Mobile-First** - Responsive design that works seamlessly across all devices
4. **Visual Feedback** - Clear interaction states for all user actions
5. **Consistency** - Predictable patterns throughout the application

---

## Color Palette

### Primary Colors
```css
Primary (Actions/CTAs):     #3B82F6  (blue-500)
Primary Hover:              #2563EB  (blue-600)
Success (Completed):        #10B981  (green-500)
Danger (Delete):            #EF4444  (red-500)
Danger Hover:               #DC2626  (red-600)
```

### Neutral Colors
```css
Background:                 #F9FAFB  (gray-50)
Subtle Background:          #F3F4F6  (gray-100)
Borders:                    #E5E7EB  (gray-200)
Border Hover:               #D1D5DB  (gray-300)
Disabled Text:              #9CA3AF  (gray-400)
Secondary Text:             #6B7280  (gray-500)
Body Text:                  #4B5563  (gray-600)
Primary Text:               #111827  (gray-900)
```

### Usage Guidelines
- **Primary Blue**: Use for all primary actions (Add button, focus rings, active states)
- **Green**: Only for completed todo indicators (checkboxes, success states)
- **Red**: Only for destructive actions (delete button, error states)
- **Grays**: All text, backgrounds, borders, and neutral UI elements

---

## Typography

### Font Family
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

### Type Scale
| Element | Size | Weight | Line Height | Tailwind Class |
|---------|------|--------|-------------|----------------|
| Page Title | 32px (2rem) | 700 | 1.2 | `text-3xl md:text-4xl font-bold` |
| Empty State | 18px (1.125rem) | 400 | 1.5 | `text-lg font-normal` |
| Todo Text | 16px (1rem) | 400 | 1.625 | `text-base font-normal leading-relaxed` |
| Input | 16px (1rem) | 400 | 1.5 | `text-base font-normal` |
| Button | 14px (0.875rem) | 500 | 1.5 | `text-sm font-medium` |

### Typography Guidelines
- Minimum font size: 16px (prevents zoom on mobile)
- Use `leading-relaxed` for multi-line text (todos)
- Use `font-bold` only for page title
- Use `font-medium` for buttons and CTAs

---

## Spacing System

### Scale (Tailwind)
```
xs:  4px   (0.25rem)   - icon spacing, minor adjustments
sm:  8px   (0.5rem)    - tight spacing between related elements
md:  16px  (1rem)      - default component padding
lg:  24px  (1.5rem)    - section spacing
xl:  32px  (2rem)      - major section breaks
```

### Common Patterns
- **Component Padding**: `p-4` (16px all sides)
- **Element Gaps**: `space-x-3` or `gap-3` (12px)
- **Input Padding**: `px-4 py-3` (16px horizontal, 12px vertical)
- **Button Padding**: `px-6 py-3` or `px-3 py-1` (depends on context)
- **Section Margins**: `mb-6` to `mb-8` (24-32px)

---

## Border Radius

| Element | Radius | Tailwind Class |
|---------|--------|----------------|
| Buttons | 6px | `rounded-md` |
| Inputs | 6px | `rounded-md` |
| Todo Items | 8px | `rounded-lg` |
| Containers | 12px | `rounded-xl` |
| Checkboxes | 4px | `rounded` |

---

## Shadows

```css
Default:        shadow-sm      (subtle elevation)
Hover:          shadow-md      (interactive feedback)
Focus:          none           (use ring instead)
```

---

## Component Specifications

## 1. Todo Item Component

### States

#### A. Normal State (Uncompleted)
```jsx
<div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all duration-150">
  {/* Checkbox */}
  <input
    type="checkbox"
    className="w-5 h-5 border-2 border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-primary focus:ring-offset-2"
    aria-label="Mark todo as complete"
  />

  {/* Text */}
  <span className="flex-1 text-base text-gray-900 leading-relaxed">
    {todo.text}
  </span>

  {/* Delete Button */}
  <button
    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
    aria-label="Delete todo"
  >
    {/* Trash Icon */}
  </button>
</div>
```

**Visual Characteristics:**
- White background with subtle border
- Checkbox: 20×20px with gray border
- Text: Full-width, gray-900
- Delete button: Hidden or subtle until hover
- Hover: Elevated shadow, darker border, slight transform

#### B. Completed State
```jsx
<div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-60 transition-all duration-150">
  {/* Checkbox - Checked */}
  <input
    type="checkbox"
    checked
    className="w-5 h-5 bg-green-500 border-green-500 rounded cursor-pointer"
  />

  {/* Text - Strikethrough */}
  <span className="flex-1 text-base text-gray-500 line-through leading-relaxed">
    {todo.text}
  </span>

  {/* Delete Button */}
  <button className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
    {/* Trash Icon */}
  </button>
</div>
```

**Visual Characteristics:**
- Gray-50 background (subtle)
- Overall opacity: 0.6
- Checkbox: Green background with white checkmark
- Text: Gray-500 with strikethrough
- Transition: 200ms for smooth completion animation

#### C. Edit Mode
```jsx
<div className="flex items-center gap-2 bg-white border-2 border-primary rounded-lg p-4">
  {/* Input Field */}
  <input
    type="text"
    value={editText}
    className="flex-1 px-3 py-2 border-none bg-white text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
    aria-label="Edit todo text"
  />

  {/* Action Buttons */}
  <button className="px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600">
    Save
  </button>
  <button className="px-3 py-1 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400">
    Cancel
  </button>
</div>
```

**Interaction Flow:**
1. Click text → Enter edit mode
2. OR: Double-click text → Enter edit mode
3. Press Enter → Save changes
4. Press Escape → Cancel editing
5. Click Save button → Save changes
6. Click Cancel button → Discard changes

---

## 2. Add Todo Input Component

```jsx
<div className="flex gap-2 mb-6 border-2 border-gray-200 rounded-lg p-1 focus-within:border-primary transition-colors">
  {/* Input */}
  <input
    type="text"
    placeholder="What needs to be done?"
    className="flex-1 px-4 py-3 text-base border-none bg-transparent focus:outline-none"
    aria-label="Add new todo"
  />

  {/* Add Button */}
  <button
    className="px-6 py-3 bg-primary text-white text-sm font-medium rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    disabled={inputEmpty}
  >
    Add
  </button>
</div>
```

**States:**
- **Empty**: Button disabled (gray-300)
- **Has Text**: Button enabled (primary blue)
- **Focus**: Parent border becomes blue-500
- **Submitting**: Button shows loading spinner (optional)

**Interaction:**
- Type text → Button enables
- Click "Add" OR press Enter → Create todo
- Clear input after submission
- Focus returns to input for quick entry

---

## 3. Overall Layout

```jsx
<div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12">
  <div className="max-w-2xl mx-auto">
    {/* Header */}
    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
      My Todos
    </h1>

    {/* Add Todo Input */}
    <AddTodoInput />

    {/* Todo List or Empty State */}
    {todos.length === 0 ? (
      <EmptyState />
    ) : (
      <div className="flex flex-col space-y-2">
        {todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
      </div>
    )}
  </div>
</div>
```

### Empty State

```jsx
<div className="py-12 text-center">
  {/* Icon (optional) */}
  <div className="mb-4 text-gray-300">
    {/* Large checkmark or list icon */}
  </div>

  <h2 className="text-lg font-normal text-gray-500 mb-2">
    No todos yet!
  </h2>

  <p className="text-base text-gray-400">
    Add your first todo to get started
  </p>
</div>
```

---

## Responsive Design

### Breakpoints
```css
Mobile (default):   320px - 767px
Tablet:             768px - 1023px
Desktop:            1024px+
```

### Responsive Patterns

#### Mobile (320px+)
- Container: `px-4 py-6`
- Title: `text-2xl`
- Todo padding: `p-3`
- Add button text: Could be "+" icon only
- Touch targets: Minimum 44×44px

#### Tablet (768px+)
- Container: `px-6 py-8`
- Title: `text-3xl`
- Todo padding: `p-4`
- Full button text: "Add"

#### Desktop (1024px+)
- Container: `max-w-2xl` centered
- Title: `text-4xl`
- Enhanced hover effects
- Smooth transitions

### Implementation
```jsx
className="px-4 py-6 md:px-6 md:py-8"
className="text-2xl md:text-3xl lg:text-4xl"
className="p-3 md:p-4"
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

#### Color Contrast
- **Normal Text (16px)**: Minimum 4.5:1 contrast ratio
- **Large Text (18px+)**: Minimum 3:1 contrast ratio
- **UI Components**: Minimum 3:1 contrast ratio

#### Focus Indicators
```css
focus:ring-2 focus:ring-primary focus:ring-offset-2
```
- All interactive elements must have visible focus indicators
- Focus ring: 2px solid blue-500
- Ring offset: 2px for clarity

#### Keyboard Navigation
- **Tab**: Navigate between interactive elements
- **Enter**: Activate buttons, submit input
- **Space**: Toggle checkboxes
- **Escape**: Cancel edit mode

#### ARIA Labels
```jsx
aria-label="Mark todo as complete"    // Checkbox
aria-label="Delete todo"              // Delete button
aria-label="Edit todo text"           // Edit input
aria-label="Add new todo"             // Add input
```

#### Touch Targets
- Minimum size: 44×44px on mobile
- Adequate spacing between targets: 8px minimum
- Checkboxes and buttons meet minimum size

---

## Interaction Patterns

### Transitions
```css
transition-all duration-150 ease-in-out     // General transitions
transition-colors duration-200              // Color changes only
```

### Hover Effects
- Todo Items: Elevated shadow (`shadow-md`), darker border
- Buttons: Darker shade of base color
- Delete Icon: Red color, subtle red background

### Loading States
- Add button: Show spinner, text "Adding..."
- Disable input during submission
- Prevent double-submission

### Error States
- Input validation: Red border, error message below
- Failed operations: Toast notification (optional)

---

## Design Tokens (for Developers)

```typescript
// colors.ts
export const colors = {
  primary: {
    DEFAULT: '#3B82F6',
    hover: '#2563EB',
  },
  success: '#10B981',
  danger: {
    DEFAULT: '#EF4444',
    hover: '#DC2626',
  },
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    900: '#111827',
  },
}

// spacing.ts
export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
}

// typography.ts
export const typography = {
  title: 'text-3xl md:text-4xl font-bold',
  todoText: 'text-base font-normal leading-relaxed',
  button: 'text-sm font-medium',
}
```

---

## Design QA Checklist

### Visual Fidelity
- [ ] Colors match specified palette exactly
- [ ] Typography sizes and weights correct
- [ ] Spacing follows defined scale
- [ ] Border radius matches specifications
- [ ] Shadows applied correctly

### Interaction States
- [ ] Hover states show visual feedback
- [ ] Focus indicators visible and styled correctly
- [ ] Active/pressed states implemented
- [ ] Disabled states are visually distinct
- [ ] Completed todos have correct styling

### Accessibility
- [ ] Focus rings visible on all interactive elements
- [ ] ARIA labels present where needed
- [ ] Keyboard navigation works completely
- [ ] Touch targets meet 44×44px minimum
- [ ] Color contrast meets WCAG 2.1 AA

### Responsive Design
- [ ] Layout adapts at all breakpoints
- [ ] Text remains readable at all sizes
- [ ] Touch targets adequate on mobile
- [ ] No horizontal scrolling
- [ ] Spacing appropriate for screen size

### User Experience
- [ ] Empty state shows when no todos
- [ ] Loading states provide feedback
- [ ] Error states are clear
- [ ] Transitions are smooth (not jarring)
- [ ] Overall feel is responsive and polished

---

## Implementation Notes

### Recommended Tech Stack
- **Framework**: React 18+ (Next.js or Vite)
- **Styling**: Tailwind CSS 3+
- **State Management**: Context API
- **Storage**: localStorage API
- **Testing**: Jest + React Testing Library

### Component Architecture
```
/components/todolist/
├── TodoContext.tsx      # Context API provider
├── TodoApp.tsx          # Main container
├── TodoItem.tsx         # Individual todo (all states)
├── AddTodoInput.tsx     # Input for new todos
├── TodoList.tsx         # List container
├── EmptyState.tsx       # No todos view
└── types.ts             # TypeScript interfaces
```

### Best Practices
1. **Component Isolation**: Each component should be self-contained
2. **Props Over State**: Pass data down, callbacks up
3. **Semantic HTML**: Use appropriate elements (button, input, etc.)
4. **Tailwind Composition**: Use Tailwind classes directly, avoid custom CSS
5. **Accessibility First**: Build accessible from the start, not as afterthought

---

## Version History

### v1.0 - 2026-02-08
- Initial design system creation
- Complete component specifications
- Accessibility requirements defined
- Responsive design patterns established
- Color palette and typography defined

---

## Contact

**Designer**: PD-1
**Team**: TodoList Team
**Questions**: Post in #design channel

---

*This design system is a living document. Update as patterns evolve and new components are added.*
