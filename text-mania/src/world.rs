use shipyard::*;
use awsm_web::window::get_window_size;
use wasm_bindgen::UnwrapThrowExt;
use shipyard_scenegraph as sg;
use crate::{
    renderer::{Renderer, camera::Camera, system::render_sys},
    tick::{TickBegin, TickUpdate, TickDraw, TickEnd},
    controller::{Controller, ControllerEvent, controller_event_sys, controller_clear_sys},
    motion::motion_sys,
    gameobjects::{
        cubes::{delete_cubes_sys,CubeSpawner,mark_delete_cubes_sys, cube_spawner_countdown_sys, cube_spawner_spawn_sys},
    },
    sefaria::SefariaRef,
    blaster::blaster_update_sys,
    collision::collision_sys,
    audio::audio_sys,
};
use std::rc::Rc;
use web_sys::AudioContext;

//pub type LocalView<'a, T> = NonSendSync<ViewMut<'a, T>>;
//pub type LocalViewMut<'a, T> = NonSendSync<ViewMut<'a, T>>;
//pub type LocalUniqueView<'a, T> = NonSendSync<UniqueView<'a, T>>;
pub type LocalUniqueViewMut<'a, T> = NonSendSync<UniqueViewMut<'a, T>>;

//pub type RendererView<'a> = LocalUniqueView<'a, Renderer>;
pub type RendererViewMut<'a> = LocalUniqueViewMut<'a, Renderer>;
pub type AudioContextViewMut<'a> = LocalUniqueViewMut<'a, AudioContext>;

pub fn init_world(mut renderer:Renderer) -> Rc<World> {
    let world = Rc::new(World::default());

    let (width, height) = get_window_size(&web_sys::window().unwrap_throw()).unwrap_throw();


    world.add_unique(Camera::new(&mut renderer, width, height));
    world.add_unique_non_send_sync(renderer);
    world.add_unique(TickBegin::default());
    world.add_unique(TickUpdate::default());
    world.add_unique(TickDraw::default());
    world.add_unique(TickEnd::default());
    world.add_unique(Controller::new());
    world.add_unique(ControllerEvent::new());
    world.add_unique(CubeSpawner::new());
    world.add_unique(SefariaRef::new());

    register_workloads(&world);
    
    sg::init(&world);

    world
}

pub const TICK_BEGIN: &str = "TICK_BEGIN";
pub const TICK_UPDATE: &str = "TICK_UPDATE";
pub const TICK_DRAW: &str = "TICK_DRAW";
pub const TICK_END: &str = "TICK_END";

pub fn register_workloads(world: &World) {

    world
        .add_workload(TICK_BEGIN)
        .with_system(system!(controller_event_sys))
        .build();


    world
        .add_workload(TICK_UPDATE)
        .with_system(system!(motion_sys))
        .with_system(system!(blaster_update_sys))
        .with_system(system!(cube_spawner_countdown_sys))
        .with_system(system!(cube_spawner_spawn_sys))
        .with_system(system!(collision_sys))
        .with_system(system!(mark_delete_cubes_sys))
        .build();

    world
        .add_workload(TICK_DRAW)
        .with_system(system!(sg::systems::trs_to_local))
        .with_system(system!(sg::systems::local_to_world))
        .with_system(system!(render_sys))
        .with_system(system!(audio_sys))
        .build();

    world
        .add_workload(TICK_END)
        .with_system(system!(controller_clear_sys))
        .with_system(system!(delete_cubes_sys))
        .build();
}
