import type { Meta, StoryObj } from '@storybook/react'
import Button from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['primary', 'secondary'],
    },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    children: 'Comprar ahora',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Ver detalles',
    variant: 'secondary',
  },
}

export const Disabled: Story = {
  args: {
    children: 'Agotado',
    disabled: true,
  },
}
