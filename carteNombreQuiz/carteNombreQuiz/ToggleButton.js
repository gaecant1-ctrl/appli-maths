export class ToggleButton {
  constructor({
    element,
    initialState = false,
    contentOn = "ON",
    contentOff = "OFF",
    onChange = null
  }) {
    this.element = element;
    this.state = initialState;
    this.contentOn = contentOn;
    this.contentOff = contentOff;
    this.onChange = onChange;

    this.element.classList.add("toggle");

    this.updateUI();

    this.element.addEventListener("click", () => {
      this.toggle();
    });
  }

  toggle() {
    this.state = !this.state;
    this.updateUI();

    if (this.onChange) {
      this.onChange(this.state);
    }
  }

  setState(newState) {
    this.state = newState;
    this.updateUI();
  }

  getState() {
    return this.state;
  }

  updateUI() {
    this.element.classList.toggle("active", this.state);
    this.element.textContent = this.state
      ? this.contentOn
      : this.contentOff;
  }
}


export class SegmentedToggle {
constructor({ container, initialValue = null, onChange = null }) {
  this.container = container;
  this.buttons = Array.from(container.querySelectorAll("button"));
  this.value = null;
  this.onChange = onChange;

  this.buttons.forEach(button => {
    button.addEventListener("click", () => {
      this.setValue(button.dataset.value);
    });
  });

  // Initialisation SANS callback
  if (initialValue !== null) {
    this.value = initialValue;

    this.buttons.forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.value === initialValue
      );
    });
  }
}

  setValue(newValue) {
    this.value = newValue;

    this.buttons.forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.value === newValue
      );
    });

    if (this.onChange) {
      this.onChange(newValue);
    }
  }

  getValue() {
    return this.value;
  }
}