use crate::textures::Texture;

pub struct OrthoQuad {}
pub struct PerspQuad {}

pub struct RenderableQuad {
    pub texture: Texture,
}

pub struct RenderableCube {
    pub texture: Texture,
    pub width: f32,
    pub height: f32,
    pub depth: f32,
}
