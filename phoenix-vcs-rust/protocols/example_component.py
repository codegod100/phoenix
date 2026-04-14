#!/usr/bin/env python3
"""
counter_component.py
A simple counter component demonstrating Python UI component patterns.
This file serves as both runnable code and a parsing example.
"""

from typing import Optional, Callable
from dataclasses import dataclass


@dataclass
class CounterProps:
    """Props for the Counter component."""
    initial_value: int = 0
    step: int = 1
    on_change: Optional[Callable[[int], None]] = None


@dataclass  
class CounterState:
    """State for the Counter component."""
    count: int = 0
    
    def __post_init__(self):
        if self.count is None:
            self.count = 0


class Component:
    """Base component class."""
    pass


class Counter(Component):
    """
    A counter component with increment/decrement buttons.
    
    Demonstrates:
    - Props/state separation
    - Event handlers
    - Conditional rendering
    - Lifecycle (init)
    """
    
    def __init__(self, props: CounterProps):
        self.props = props
        self.state = CounterState(count=props.initial_value)
        self._mounted = False
        
    def mount(self):
        """Lifecycle: component mounted."""
        self._mounted = True
        print(f"Counter mounted with initial value: {self.state.count}")
        
    def unmount(self):
        """Lifecycle: component will unmount."""
        self._mounted = False
        print("Counter unmounting")
        
    def increment(self, event=None):
        """Event handler: increment count."""
        self.state.count += self.props.step
        self._notify_change()
        self.render()
        
    def decrement(self, event=None):
        """Event handler: decrement count."""
        self.state.count -= self.props.step
        self._notify_change()
        self.render()
        
    def reset(self, event=None):
        """Event handler: reset to initial value."""
        self.state.count = self.props.initial_value
        self._notify_change()
        self.render()
        
    def _notify_change(self):
        """Call on_change callback if provided."""
        if self.props.on_change:
            self.props.on_change(self.state.count)
            
    def render(self):
        """
        Render the component UI.
        
        Returns a UI tree representation (simplified for example).
        In a real framework, this would return native UI elements.
        """
        # Determine if reset button should show
        show_reset = self.state.count != self.props.initial_value
        
        # Build UI tree
        ui_tree = {
            "type": "box",
            "class": "counter",
            "children": [
                {
                    "type": "heading",
                    "level": 2,
                    "text": "Counter"
                },
                {
                    "type": "text",
                    "text": f"Count: {self.state.count}"
                },
                {
                    "type": "box",
                    "class": "button-group",
                    "children": [
                        {
                            "type": "button",
                            "class": "decrement",
                            "text": "-",
                            "on_click": self.decrement,
                            "disabled": self.state.count <= -100
                        },
                        {
                            "type": "button", 
                            "class": "increment",
                            "text": "+",
                            "on_click": self.increment,
                            "disabled": self.state.count >= 100
                        }
                    ]
                }
            ]
        }
        
        # Conditional: add reset button if count changed
        if show_reset:
            ui_tree["children"].append({
                "type": "button",
                "class": "reset",
                "text": "Reset",
                "on_click": self.reset
            })
            
        # Conditional: show warning if count is high
        if self.state.count > 90:
            ui_tree["children"].append({
                "type": "text",
                "class": "warning",
                "text": "Getting close to limit!"
            })
            
        return ui_tree


def main():
    """Example usage of Counter component."""
    # Create component with props
    props = CounterProps(
        initial_value=0,
        step=5,
        on_change=lambda new_val: print(f"Count changed to: {new_val}")
    )
    
    counter = Counter(props)
    counter.mount()
    
    # Simulate interactions
    print("\n--- Initial render ---")
    print(counter.render())
    
    print("\n--- After increment ---")
    counter.increment()
    print(counter.render())
    
    print("\n--- After 20 increments ---")
    for _ in range(20):
        counter.increment()
    print(counter.render())
    
    print("\n--- After reset ---")
    counter.reset()
    print(counter.render())
    
    counter.unmount()


if __name__ == "__main__":
    main()
