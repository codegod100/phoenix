// Lit Framework Template
// Reads component metadata and generates Lit code
// Placeholders: %{imports}%, %{decorator}%, %{class}%, %{props}%, %{constructor}%, %{methods}%, %{styles}%, %{render}%

%{imports}%

%{decorator}%
%{class}% {
%{props}%

%{constructor}%

%{styles}%

%{methods}%

%{render}%
}

declare global {
  interface HTMLElementTagNameMap {
    '%{tag}%': %{class_name}%;
  }
}
