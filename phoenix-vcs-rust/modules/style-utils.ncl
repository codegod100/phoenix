# Style Utils Module
# Imports theme based on themeName param from spec.md

fun params =>
let themeName = params.themeName in
let theme = import "theme-%{themeName}%.ncl" in
{
  id = "style-utils",
  name = "Style Utilities",
  description = "CSS-in-JS utilities with %{themeName}% theme",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  config = {
    rosewater = theme.rosewater,
    flamingo = theme.flamingo,
    pink = theme.pink,
    mauve = theme.mauve,
    red = theme.red,
    maroon = theme.maroon,
    peach = theme.peach,
    yellow = theme.yellow,
    green = theme.green,
    teal = theme.teal,
    sky = theme.sky,
    sapphire = theme.sapphire,
    blue = theme.blue,
    lavender = theme.lavender,
    text = theme.text,
    subtext1 = theme.subtext1,
    subtext0 = theme.subtext0,
    overlay2 = theme.overlay2,
    overlay1 = theme.overlay1,
    overlay0 = theme.overlay0,
    surface2 = theme.surface2,
    surface1 = theme.surface1,
    surface0 = theme.surface0,
    base = theme.base,
    mantle = theme.mantle,
    crust = theme.crust
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "style-utils-template.ts"
  },

  provides = [
    { interface = "Styling", properties = { type = "css-in-js", framework = "vanilla", theme = themeName } }
  ],

  needs = []
}
