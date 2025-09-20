import React from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const agentTypes = [
  {
    value: "ChatAgent",
    label: "Chat Agent",
  },
  {
    value: "CallAgent",
    label: "Calling Agent",
  },
  {
    value: "SalesAgent",
    label: "Sales Agent",
  },
  {
    value: "MarketingAgent",
    label: "Marketing Agent",
  },
];

export default function AgentTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label
        className="block text-xs font-semibold text-muted-foreground mb-1"
        htmlFor="agent-type"
      >
        Agent Type
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="agent-type" className="w-full">
          <SelectValue placeholder="Select agent type" />
        </SelectTrigger>
        <SelectContent side="bottom" align="start">
          {agentTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
