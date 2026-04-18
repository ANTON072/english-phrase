import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ErrorMessage } from "./ErrorMessage";

const meta = {
  title: "Components/ErrorMessage",
  component: ErrorMessage,
  args: { onRetry: fn() },
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: "データの取得に失敗しました",
  },
};

export const NetworkError: Story = {
  args: {
    message: "ネットワークエラーが発生しました。接続を確認してください。",
  },
};
