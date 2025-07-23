import type { Meta, StoryObj } from '@storybook/react'
import Input from './Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'search', 'error'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'tu@email.com',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'tu@email.com',
    error: 'Email inválido',
  },
}

export const Search: Story = {
  args: {
    variant: 'search',
    placeholder: 'Buscar relojes...',
  },
}
