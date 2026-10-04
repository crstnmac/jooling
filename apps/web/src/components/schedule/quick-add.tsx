import { Button } from "@SchedulesManager/ui/components/button";
import { Input } from "@SchedulesManager/ui/components/input";
import { useMutation } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkplace } from "@/lib/use-workplace";

interface QuickAddRowProps {
	label: string;
	placeholder: string;
	submitLabel: string;
	inputType?: "text" | "email";
	pending: boolean;
	onSubmit: (value: string) => void;
}

/** A dashed "+ label" button that expands into a one-field inline form. */
function QuickAddRow({
	label,
	placeholder,
	submitLabel,
	inputType = "text",
	pending,
	onSubmit,
}: QuickAddRowProps) {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState("");

	if (!open) {
		return (
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="self-start text-muted-foreground"
				onClick={() => setOpen(true)}
			>
				<PlusIcon data-icon="inline-start" />
				{label}
			</Button>
		);
	}

	const submit = () => {
		const trimmed = value.trim();
		if (!trimmed || pending) return;
		onSubmit(trimmed);
	};

	return (
		<div className="flex items-center gap-1.5">
			<Input
				autoFocus
				type={inputType}
				value={value}
				placeholder={placeholder}
				aria-label={label}
				onChange={(event) => setValue(event.target.value)}
				onKeyDown={(event) => {
					// Enter must not submit the surrounding shift form.
					if (event.key === "Enter") {
						event.preventDefault();
						submit();
					}
					if (event.key === "Escape") {
						event.stopPropagation();
						setOpen(false);
						setValue("");
					}
				}}
			/>
			<Button
				type="button"
				size="sm"
				disabled={pending || value.trim() === ""}
				onClick={submit}
			>
				{submitLabel}
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => {
					setOpen(false);
					setValue("");
				}}
			>
				Cancel
			</Button>
		</div>
	);
}

export function QuickAddPosition({
	onCreated,
}: {
	onCreated: (positionId: string) => void | Promise<void>;
}) {
	const { workplace } = useWorkplace();
	const create = useMutation({
		mutationFn: (name: string) =>
			api<{ position: { id: string; name: string } }>(
				`/v1/workplaces/${workplace?.id}/positions`,
				{ method: "POST", body: { name } },
			),
		onSuccess: async ({ position }) => {
			await onCreated(position.id);
			toast.success(`Position “${position.name}” added.`);
		},
		onError: (error) => toast.error((error as Error).message),
	});
	// Remount after success so the row collapses and clears.
	return (
		<QuickAddRow
			key={create.submittedAt}
			label="New position"
			placeholder="Position name"
			submitLabel="Add"
			pending={create.isPending}
			onSubmit={(name) => create.mutate(name)}
		/>
	);
}

export function QuickInviteWorker({
	locationId,
	positionId,
}: {
	locationId: string | undefined;
	positionId: string;
}) {
	const { workplace } = useWorkplace();
	const invite = useMutation({
		mutationFn: (email: string) =>
			api(`/v1/workplaces/${workplace?.id}/invitations`, {
				method: "POST",
				body: {
					email,
					kind: "worker",
					locationIds: locationId ? [locationId] : [],
					positionIds: positionId ? [positionId] : [],
				},
			}),
		onSuccess: (_data, email) =>
			toast.success(
				`Invitation sent to ${email}. They can be assigned shifts once they accept.`,
			),
		onError: (error) => toast.error((error as Error).message),
	});
	return (
		<QuickAddRow
			key={invite.submittedAt}
			label="Invite worker"
			placeholder="worker@email.com"
			submitLabel="Invite"
			inputType="email"
			pending={invite.isPending}
			onSubmit={(email) => invite.mutate(email)}
		/>
	);
}
