import { createMachine, createActor } from "xstate";

const toggleMachine = createMachine({
	id: "toggle",
	initial: "Inactive",
	states: {
		Inactive: {
			on: { toggle: "Active" }
		},
		Active: {
			on: { toggle: "Inactive" }
		}
	}
});

// Create an actor that you can send events to.
// Note: the actor is not started yet!
const actor = createActor(toggleMachine);

// Subscribe to snapshots (emitted state changes) from the actor
actor.subscribe((snapshot) => {
	console.log("Value:", snapshot.value);
});

// Start the actor
actor.start(); // logs 'Inactive'

// Send events
actor.send({ type: "toggle" }); // logs 'Active'
actor.send({ type: "toggle" }); // logs 'Inactive'
