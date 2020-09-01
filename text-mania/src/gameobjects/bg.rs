use shipyard_scenegraph as sg;
use nalgebra::Vector3;
use shipyard::*;
use crate::{
    renderer::components::*,
    textures::GameTextures,
};
pub fn create(world:&World) {

    let entity = sg::spawn_child(world, None, None, None, None, None);

    let (entities, textures, mut translations, mut quads, mut ortho_quads) = 
            world.borrow::<(EntitiesViewMut, UniqueView<GameTextures>, ViewMut<sg::Translation>, ViewMut<RenderableQuad>, ViewMut<OrthoQuad>)>();



    entities.add_component(
                (&mut quads, &mut translations, &mut ortho_quads), 
                (
                    RenderableQuad { texture: textures.bg.clone()},
                    sg::Translation(Vector3::new(0.0, 0.0, -10.0)),
                    OrthoQuad{}
                ),
                entity
            );
}
