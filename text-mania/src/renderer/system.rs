use crate::{
    world::RendererViewMut,
    tick::TickDraw,
    renderer::{components::*, camera::Camera}
};
use shipyard_scenegraph::WorldTransform;
use shipyard::*;

pub fn render_sys(
    _tick: UniqueView<TickDraw>, 
    camera:UniqueView<Camera>, 
    mut renderer: RendererViewMut, 
    world_transforms: View<WorldTransform>, 
    quads: View<RenderableQuad>, 
    cubes: View<RenderableCube>, 
    ortho_quads: View<OrthoQuad>, 
    persp_quads: View<PerspQuad>, 
) {
    renderer.pre_render();

    let it = (&quads, &world_transforms, &ortho_quads).iter();
    renderer.render_ortho_quads(it, &camera.ortho_proj_mat);

    renderer.clear_depth();

    let it = (&cubes, &world_transforms).iter();
    renderer.render_cubes(it, &camera.persp_proj_mat);
    
    let it = (&quads, &world_transforms, &persp_quads).iter();
    renderer.render_persp_quads(it, &camera.persp_proj_mat);

    renderer.post_render(&camera);
}
