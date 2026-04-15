//! Kitty Core: DisCoCat Types and Diagrams
//!
//! Ported from lambeq's backend/grammar.py
//! Provides formal pregroup grammar types with adjoints (n.r, n.l)
//! and string diagram composition for categorical semantics.

use std::fmt;
use std::hash::{Hash, Hasher};

/// A type in the pregroup grammar category.
///
/// Every type is either atomic, complex, or empty. Complex types are
/// tensor products of atomic types, and empty types are the identity.
///
/// # Examples
/// ```
/// use phoenix_vcs::kitty::types::PregroupType;
///
/// // Atomic type
/// let n = PregroupType::atomic("n");
/// assert!(n.is_atomic());
///
/// // With adjoint (right)
/// let nr = n.adjoint_right();
/// assert_eq!(nr.to_string(), "n.r");
///
/// // Tensor product
/// let complex = n.tensor(&nr);
/// assert_eq!(complex.to_string(), "n @ n.r");
/// ```
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PregroupType {
    /// Name for atomic types (None for empty or complex)
    name: Option<String>,
    /// Objects for complex types (tensor product components)
    objects: Vec<PregroupType>,
    /// Winding number: 0=base, >0=right adjoint, <0=left adjoint
    z: i32,
}

impl PregroupType {
    /// Create an empty type (identity)
    pub fn empty() -> Self {
        Self {
            name: None,
            objects: vec![],
            z: 0,
        }
    }

    /// Create an atomic type
    pub fn atomic(name: impl Into<String>) -> Self {
        Self {
            name: Some(name.into()),
            objects: vec![],
            z: 0,
        }
    }

    /// Create from a list of types (tensor product)
    pub fn tensor_product(objects: Vec<Self>) -> Self {
        if objects.is_empty() {
            Self::empty()
        } else if objects.len() == 1 {
            objects.into_iter().next().unwrap()
        } else {
            Self {
                name: None,
                objects,
                z: 0,
            }
        }
    }

    /// Check if this is the empty type
    pub fn is_empty(&self) -> bool {
        self.name.is_none() && self.objects.is_empty()
    }

    /// Check if this is an atomic type
    pub fn is_atomic(&self) -> bool {
        self.name.is_some() && self.objects.is_empty()
    }

    /// Check if this is a complex type (tensor product)
    pub fn is_complex(&self) -> bool {
        !self.objects.is_empty()
    }

    /// Get the name (for atomic types)
    pub fn name(&self) -> Option<&str> {
        self.name.as_deref()
    }

    /// Get the winding number
    pub fn z(&self) -> i32 {
        self.z
    }

    /// Get the objects (for complex types)
    pub fn objects(&self) -> &[Self] {
        &self.objects
    }

    /// Create right adjoint (n → n.r)
    pub fn adjoint_right(&self) -> Self {
        assert!(self.is_atomic() || self.is_empty(),
                "Adjoints only defined for atomic or empty types");
        Self {
            name: self.name.clone(),
            objects: vec![],
            z: self.z + 1,
        }
    }

    /// Create left adjoint (n → n.l)
    pub fn adjoint_left(&self) -> Self {
        assert!(self.is_atomic() || self.is_empty(),
                "Adjoints only defined for atomic or empty types");
        Self {
            name: self.name.clone(),
            objects: vec![],
            z: self.z - 1,
        }
    }

    /// Tensor product with another type (self @ other)
    pub fn tensor(&self, other: &Self) -> Self {
        let mut objects = vec![];

        // Flatten if self is complex
        if self.is_complex() {
            objects.extend(self.objects.clone());
        } else if !self.is_empty() {
            objects.push(self.clone());
        }

        // Flatten if other is complex
        if other.is_complex() {
            objects.extend(other.objects.clone());
        } else if !other.is_empty() {
            objects.push(other.clone());
        }

        Self::tensor_product(objects)
    }

    /// Check if this type can connect to another via a cup
    /// (i.e., one is the adjoint of the other)
    ///
    /// In pregroup grammar, a cup n @ n.r → I connects:
    /// - n (base type, z=0) with n.r (right adjoint, z=1)
    /// - n (base type, z=0) with n.l (left adjoint, z=-1)
    ///
    /// Note: n.r and n.l cannot connect to each other (both are adjoints,
    /// but of different "directions")
    pub fn can_connect(&self, other: &Self) -> bool {
        if self.is_atomic() && other.is_atomic() {
            // Same base name required
            if self.name != other.name {
                return false;
            }

            // Exactly one is base (z=0), other is adjoint (z≠0)
            // This means: (self.z == 0) XOR (other.z == 0)
            let self_is_base = self.z == 0;
            let other_is_base = other.z == 0;

            self_is_base != other_is_base  // XOR: exactly one is base
        } else {
            false
        }
    }

    /// Get base type (remove all adjoints)
    pub fn base(&self) -> Self {
        Self {
            name: self.name.clone(),
            objects: vec![],
            z: 0,
        }
    }

    /// Parse a type string like "n.r", "n @ n.r @ s", "TaskCreated.r"
    pub fn parse(s: &str) -> Result<Self, String> {
        // Handle tensor products
        if s.contains(" @ ") {
            let parts: Result<Vec<_>, _> = s.split(" @ ")
                .map(|p| Self::parse(p.trim()))
                .collect();
            return Ok(Self::tensor_product(parts?));
        }

        // Handle atomic with adjoints
        let mut name = s.to_string();
        let mut z = 0i32;

        // Count right adjoints (.r)
        while name.ends_with(".r") {
            name.truncate(name.len() - 2);
            z += 1;
        }

        // Count left adjoints (.l)
        while name.ends_with(".l") {
            name.truncate(name.len() - 2);
            z -= 1;
        }

        if name.is_empty() {
            return Err(format!("Invalid type string: {}", s));
        }

        Ok(Self {
            name: Some(name),
            objects: vec![],
            z,
        })
    }
}

impl fmt::Display for PregroupType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.is_empty() {
            write!(f, "Ty()")
        } else if self.is_atomic() {
            let adjoints: String = if self.z > 0 {
                ".r".repeat(self.z as usize)
            } else {
                ".l".repeat((-self.z) as usize)
            };
            write!(f, "{}{}", self.name.as_ref().unwrap(), adjoints)
        } else {
            let parts: Vec<String> = self.objects.iter()
                .map(|o| o.to_string())
                .collect();
            write!(f, "{}", parts.join(" @ "))
        }
    }
}

impl Hash for PregroupType {
    fn hash<H: Hasher>(&self, state: &mut H) {
        // Hash based on string representation
        self.to_string().hash(state);
    }
}

/// Type environment for tracking variable types
#[derive(Debug, Clone, Default)]
pub struct TypeEnv {
    bindings: std::collections::HashMap<String, PregroupType>,
}

impl TypeEnv {
    pub fn new() -> Self {
        Self {
            bindings: std::collections::HashMap::new(),
        }
    }

    pub fn bind(&mut self, name: impl Into<String>, typ: PregroupType) {
        self.bindings.insert(name.into(), typ);
    }

    pub fn lookup(&self, name: &str) -> Option<&PregroupType> {
        self.bindings.get(name)
    }

    pub fn unify(&self, t1: &PregroupType, t2: &PregroupType) -> Result<PregroupType, String> {
        if t1 == t2 {
            Ok(t1.clone())
        } else if t1.can_connect(t2) {
            // Cup eliminates the pair, returning unit
            Ok(PregroupType::empty())
        } else {
            Err(format!("Cannot unify {} and {}", t1, t2))
        }
    }
}

/// Common atomic types used in API specifications
pub mod api_types {
    use super::PregroupType;

    /// User type
    pub fn user() -> PregroupType {
        PregroupType::atomic("User")
    }

    /// Task type
    pub fn task() -> PregroupType {
        PregroupType::atomic("Task")
    }

    /// Auth token type
    pub fn auth_token() -> PregroupType {
        PregroupType::atomic("AuthToken")
    }

    /// Request input type
    pub fn input() -> PregroupType {
        PregroupType::atomic("Input")
    }

    /// Response output type
    pub fn output() -> PregroupType {
        PregroupType::atomic("Output")
    }

    /// Sentence type (for complete specifications)
    pub fn sentence() -> PregroupType {
        PregroupType::atomic("s")
    }

    /// Noun type (for general entities)
    pub fn noun() -> PregroupType {
        PregroupType::atomic("n")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_atomic_type() {
        let t = PregroupType::atomic("Task");
        assert!(t.is_atomic());
        assert!(!t.is_complex());
        assert!(!t.is_empty());
        assert_eq!(t.to_string(), "Task");
    }

    #[test]
    fn test_adjoints() {
        let n = PregroupType::atomic("n");
        let nr = n.adjoint_right();
        let nl = n.adjoint_left();

        assert_eq!(nr.to_string(), "n.r");
        assert_eq!(nl.to_string(), "n.l");
        assert_eq!(nr.z(), 1);
        assert_eq!(nl.z(), -1);
    }

    #[test]
    fn test_tensor_product() {
        let n = PregroupType::atomic("n");
        let s = PregroupType::atomic("s");
        let nr = n.adjoint_right();

        let complex = n.tensor(&nr).tensor(&s);
        assert!(complex.is_complex());
        assert_eq!(complex.to_string(), "n @ n.r @ s");
    }

    #[test]
    fn test_can_connect() {
        let n = PregroupType::atomic("n");
        let nr = n.adjoint_right();
        let nl = n.adjoint_left();

        assert!(n.can_connect(&nr));  // n and n.r can connect
        assert!(n.can_connect(&nl));  // n and n.l can connect
        assert!(nr.can_connect(&n));  // symmetric
        assert!(!n.can_connect(&n));  // same type cannot connect
        assert!(!nr.can_connect(&nl)); // different adjoint directions
    }

    #[test]
    fn test_parse() {
        let t = PregroupType::parse("Task.r").unwrap();
        assert_eq!(t.to_string(), "Task.r");
        assert_eq!(t.z(), 1);

        let complex = PregroupType::parse("n @ n.r @ s").unwrap();
        assert!(complex.is_complex());
        assert_eq!(complex.objects().len(), 3);
    }

    #[test]
    fn test_type_env() {
        let mut env = TypeEnv::new();
        env.bind("user", api_types::user());
        env.bind("task", api_types::task());

        assert!(env.lookup("user").is_some());
        assert!(env.lookup("unknown").is_none());
    }

    #[test]
    fn test_unify() {
        let env = TypeEnv::new();
        let n = PregroupType::atomic("n");
        let nr = n.adjoint_right();

        // Same types unify
        assert!(env.unify(&n, &n).is_ok());

        // Connecting types unify to unit
        let result = env.unify(&n, &nr).unwrap();
        assert!(result.is_empty());

        // Non-matching types fail
        let s = PregroupType::atomic("s");
        assert!(env.unify(&n, &s).is_err());
    }
}
