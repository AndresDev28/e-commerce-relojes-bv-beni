import type { Meta, StoryObj } from '@storybook/react'
import Spinner from './Spinner'

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'radio' },
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: { type: 'radio' },
      options: ['primary', 'white'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Spinner>

export const Default: Story = {
  args: {
    size: 'md',
    variant: 'primary',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    variant: 'primary',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    variant: 'primary',
  },
}

export const White: Story = {
  args: {
    variant: 'white',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
}
