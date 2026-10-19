import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@devmentor/ui/components/ui/badge";
import { Button } from "@devmentor/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/ui/card";
import { Input } from "@devmentor/ui/components/ui/input";
import { Label } from "@devmentor/ui/components/ui/label";
import { useId } from "react";
import { ThemePair } from "../../.storybook/blocks/theme-frame";

// Próbka prawdziwych komponentów pakietu w motywie — sprawdza tokeny i a11y w obu motywach.
function ThemeSample() {
  const emailId = useId();
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Zaproś mentora</CardTitle>
        <CardDescription>Link z zaproszeniem jest ważny 14 dni i działa jeden raz.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-between-groups">
        <div className="grid gap-in-group">
          <Label htmlFor={emailId}>Adres e-mail</Label>
          <Input id={emailId} type="email" defaultValue="anna.nowak@example.com" />
        </div>
        <div className="flex flex-wrap items-center gap-in-group">
          <Badge>Oczekuje</Badge>
          <Badge variant="secondary">Przyjęte</Badge>
          <Badge variant="outline">Wygasło</Badge>
          <span className="font-code text-body tabular-nums">150 PLN · 50 min</span>
        </div>
        <div className="flex flex-wrap gap-in-group">
          <Button>Zaproś mentora</Button>
          <Button variant="outline">Anuluj</Button>
          <Button variant="destructive">Odbierz rolę mentora</Button>
        </div>
        <p className="text-body">
          Szczegóły w{" "}
          <a className="text-primary underline underline-offset-4" href="#regulamin">
            regulaminie zaproszeń
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

const meta = {
  title: "Foundations/Themes",
  component: ThemeSample,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ThemeSample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CurrentTheme: Story = {};

export const SideBySide: Story = {
  render: () => (
    <ThemePair>
      <ThemeSample />
    </ThemePair>
  ),
};
