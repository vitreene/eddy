export type Subscribed<T> = (data: T) => void | boolean;

export class PubSub<T> extends Set<Subscribed<T>> {
	subscribe = (fn: Subscribed<T>) => {
		this.add(fn);
		return () => {
			this.delete(fn);
		};
	};
	reset = () => {
		this.clear();
	};
	update = (data: T) => {
		this.forEach((fn) => fn(data));
	};
}
