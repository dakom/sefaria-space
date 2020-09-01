use shipyard_scenegraph as sg;
use nalgebra::{Vector3, Quaternion, Unit, UnitQuaternion};
use shipyard::*;
use crate::{
    textures::{GameTextures, Texture},
    renderer::components::*,
    motion::Motion,
    world::RendererViewMut,
    config::*,
    tick::{TickBegin, TickUpdate},
    controller::*,
    gameobjects::cubes::BlasterCube,
};
use shipyard_scenegraph::*;
use wasm_bindgen::prelude::*;

pub struct Blaster {
    pub entity:EntityId,
}


pub fn create(world:&World) {

    let entity = {
        let entity = sg::spawn_child(world, None, None, None, None, None);

        let (
            entities, 
            textures,
            mut renderer,
            mut translations, 
            mut rotations, 
            mut cubes, 
        ) = world.borrow::<(
            EntitiesViewMut,
            UniqueView<GameTextures>, 
            RendererViewMut,
            ViewMut<sg::Translation>, 
            ViewMut<sg::Rotation>, 
            ViewMut<RenderableCube>, 
        )>();

        let origin = Vector3::new(0.0, DESTINATION_Y, DESTINATION_Z);


        let axis = Unit::new_normalize(Vector3::new(1.0, 0.0, 0.0));
        let rot = UnitQuaternion::from_axis_angle(&axis, -ROTATION_X.to_radians());
          

        entities.add_component(
            (&mut cubes, &mut translations, &mut rotations), 
            (
                RenderableCube { 
                    texture: textures.blaster.clone(),
                    width: BLASTER_WIDTH, 
                    height: BLASTER_HEIGHT, 
                    depth: BLASTER_DEPTH, 
                },
                sg::Translation(origin),
                sg::Rotation(rot),
            ),
            entity
        );

        entity
    };

    world.add_unique(Blaster { entity } );
}


pub fn blaster_update_sys<'a>(
    tick: UniqueView<TickUpdate>, 
    controller:UniqueView<Controller>,
    blaster:UniqueView<Blaster>,
    textures:UniqueView<GameTextures>,
    mut entities: EntitiesViewMut<'a>,
    mut game_objects: (
        ViewMut<'a, RenderableCube>,
        ViewMut<'a, BlasterCube>,
        ViewMut<'a, Motion>,
    ),
    mut hierarchy_storages: (
        UniqueView<'a, TransformRoot>, 
        ViewMut<'a, Parent<SceneGraph>>,
        ViewMut<'a, Child<SceneGraph>>,
    ),
    mut transform_storages: (
        ViewMut<'a, Translation>,
        ViewMut<'a, Rotation>,
        ViewMut<'a, Scale>, 
        ViewMut<'a, Origin>, 
        ViewMut<'a, LocalTransform>, 
        ViewMut<'a, WorldTransform>, 
        ViewMut<'a, DirtyTransform>
    )
) {
    let left_state = controller.0.get(&ControllerAction::Left);
    let right_state = controller.0.get(&ControllerAction::Right);
    let fire_state = controller.0.get(&ControllerAction::Fire);

    if let Some(left_state) = left_state {
        if *left_state != ControllerState::Released {
            let translation = (&mut transform_storages.0).get(blaster.entity);
            if translation.x > CUBE_X_MIN {
                translation.x -= BLASTER_MOVE_AMOUNT * tick.delta;
            }
        }
    }
    if let Some(right_state) = right_state {
        if *right_state != ControllerState::Released {
            let translation = (&mut transform_storages.0).get(blaster.entity);
            if translation.x < CUBE_X_MAX {
                translation.x += BLASTER_MOVE_AMOUNT * tick.delta;
            }
        }
    }
    if let Some(fire_state) = fire_state {
        if *fire_state == ControllerState::Activated {
            //spawn a quad!
            let mut pos:Vector3<f64> = (&mut transform_storages.0).get(blaster.entity).0;
            pos.x -= 4.0;
            let dest = Vector3::new(pos.x, ORIGIN_Y, ORIGIN_Z);
            let axis = Unit::new_normalize(Vector3::new(1.0, 0.0, 0.0));
            let rot = UnitQuaternion::from_axis_angle(&axis, 0f64.to_radians());
            let rot = UnitQuaternion::from_axis_angle(&axis, -ROTATION_X.to_radians());

            let entity = {
                let mut storages:TransformHierarchyStoragesMut = (
                    &mut entities,
                    &mut hierarchy_storages.0, 
                    &mut hierarchy_storages.1, 
                    &mut hierarchy_storages.2,
                    &mut transform_storages.0, 
                    &mut transform_storages.1, 
                    &mut transform_storages.2, 
                    &mut transform_storages.3, 
                    &mut transform_storages.4, 
                    &mut transform_storages.5, 
                    &mut transform_storages.6
                );
                storages.spawn_child(None, None, None, None, None)
            };

            let mut quads = game_objects.0;
            let mut blaster_cubes = game_objects.1;
            let mut motions = game_objects.2;
            let mut translations = transform_storages.0;
            let mut rotations = transform_storages.1;
            entities.add_component(
                (&mut quads, &mut translations, &mut rotations, &mut motions, &mut blaster_cubes), 
                (
                    RenderableCube { 
                        texture: textures.laser.clone(),
                        width: BLASTER_WIDTH,
                        height: BLASTER_HEIGHT,
                        depth: BLASTER_DEPTH,
                    },
                    sg::Translation(pos),
                    sg::Rotation(rot),
                    Motion::new(pos, dest, 1.3),
                    BlasterCube{}
                ),
                entity
            );
        }
    }
}
