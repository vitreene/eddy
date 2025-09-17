export class PubSub<T extends Function> extends Set {
	subscribe = (fn: T) => {
		this.add(fn);
		return () => {
			this.delete(fn);
		};
	};
	reset = () => {
		this.clear();
	};
	update = (data: unknown) => {
		this.forEach((fn) => fn(data));
	};
}
