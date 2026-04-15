# User Logic - Framework-agnostic user profile functionality

{
  # Get initials from name
  getInitials = fun name =>
    let parts = String.split " " name in
    parts 
    |> Array.map (fun part => String.substring 0 1 part)
    |> String.concat ""
    |> String.uppercase
    |> fun s => String.substring 0 2 s,

  # Validate email format (basic)
  isValidEmail = fun email =>
    String.contains "@" email && String.contains "." email,

  # Format user display name
  formatDisplayName = fun name =>
    name |> String.trim,
}
