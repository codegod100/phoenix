// phoenix-vcs: Regenerative version control that compiles intent to working software

pub mod cli;
pub mod spec;
pub mod ncl;
pub mod ncl_parse;
pub mod kitty;
pub mod capability_fulfillment;
#[cfg(feature = "panproto")]
pub mod ncl_panproto;
pub mod pipeline;
pub mod status;
pub mod drift;
pub mod evidence;
pub mod boundary;
pub mod cascade;
pub mod shadow;
pub mod identity;
pub mod lens;
pub mod reverse;
pub mod llm;
pub mod codegen;

#[cfg(test)]
pub mod experiments;

/// Example modules demonstrating Phoenix VCS capabilities
pub mod examples {
    /// NCL to Go function converter
    pub mod ncl_to_go;
}

