// phoenix-vcs: Regenerative version control that compiles intent to working software

pub mod cli;
pub mod spec;
pub mod ncl;
pub mod ncl_parse;
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
