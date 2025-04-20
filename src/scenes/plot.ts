// const p1 = document.createElement('div');
// document.body.appendChild(p1);
// const p2 = document.createElement('div');
// document.body.appendChild(p2);
// const p3 = document.createElement('div');
// document.body.appendChild(p3);
// const p4 = document.createElement('div');
// document.body.appendChild(p4);
// const n1 = document.createElement('div');
// document.body.appendChild(n1);
// const n2 = document.createElement('div');
// document.body.appendChild(n2);
// const n3 = document.createElement('div');
// document.body.appendChild(n3);
// const n4 = document.createElement('div');
// document.body.appendChild(n4);

export function plot($el, x, y, color = 'yellowgreen') {
	if (typeof x == 'number') x = `${x}px`;
	if (typeof y == 'number') y = `${y}px`;
	$el.style = `
  position:absolute; 
  border-radius:50%;
  width:1px;
  height:1px;
  outline:4px solid ${color};
  top:${y};
  left:${x}`;
}

// plot(p1, old.x, old.y);
// plot(p2, current.x, current.y);
