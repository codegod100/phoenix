// phoenix-vcs: Regenerative version control that compiles intent to working software

pub mod app_generator;
pub mod boundary;
pub mod cascade;
pub mod cli;
pub mod codegen;
pub mod drift;
pub mod evidence;
pub mod identity;
pub mod kitty;
pub mod lens;
pub mod llm;
pub mod ncl;
pub mod ncl_parse;
pub mod ncl_panproto;
pub mod pipeline;
pub mod reverse;
pub mod shadow;
pub mod spec;
pub mod status;
pub mod capability_fulfillment;

#[cfg(test)]
pub mod experiments;

/// Example modules demonstrating Phoenix VCS capabilities
pub mod examples {
    /// NCL to Go function converter
    pub mod ncl_to_go;
}

