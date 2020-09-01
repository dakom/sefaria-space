use nalgebra::{Vector3, Quaternion, Unit, UnitQuaternion};
use shipyard::*;
use crate::{
    tick::TickUpdate,
    textures::{GameTextures, Texture},
    renderer::components::RenderableCube,
    motion::Motion,
    world::RendererViewMut,
    config::*,
    sefaria::SefariaRef,
};
use rand::prelude::*;
use shipyard_scenegraph::{self as sg, *};

pub struct GameCube {
    pub letter: usize
}
pub struct BlasterCube {}
pub struct DeleteCube {}

pub fn mark_delete_cubes_sys(
    entities: EntitiesViewMut,
    cubes: View<RenderableCube>, 
    game_cubes: View<GameCube>, 
    blaster_cubes: View<BlasterCube>, 
    mut delete_cubes: ViewMut<DeleteCube>, 
    translations: View<sg::Translation>,
    motions: View<Motion>,
) {
    let entities_to_delete = {
        let mut entities:Vec<EntityId> = 
            (&cubes, &game_cubes, &translations, &motions)
                .iter()
                .with_id()
                .filter(|(_, (_cube, _type, translation, _motion))| {
                    translation.0.z > Z_GAMECUBE_THRESHHOLD 
                })
                .map(|(id, _)| { id })
                .collect();

        let blaster_entities:Vec<EntityId> = 
            (&cubes, &blaster_cubes, &translations, &motions)
                .iter()
                .with_id()
                .filter(|(_, (_cube, _type, translation, _motion))| {
                    translation.0.z < Z_BLASTER_THRESHHOLD 
                })
                .map(|(id, _)| { id })
                .collect();

        entities.extend(blaster_entities.into_iter());

        entities
    };

    for entity in entities_to_delete {
        entities.add_component(&mut delete_cubes, DeleteCube {}, entity);
    }
}

pub fn delete_cubes_sys(mut all_storages: AllStoragesViewMut) {
    let entities = {
        let (cubes, deletes) = 
            all_storages.borrow::<(
                View<RenderableCube>, 
                View<DeleteCube>, 
            )>();

        let mut entities:Vec<EntityId> = 
            (&cubes, &deletes)
                .iter()
                .with_id()
                .map(|(id, _)| { id })
                .collect();

        entities
    };

    //Need to delete from the hierarchy first...
    for entity in entities.iter() {
            let mut storages = all_storages.borrow::<(EntitiesViewMut, ViewMut<Parent<SceneGraph>>, ViewMut<Child<SceneGraph>>)>();
            let mut hierarchy = (&mut storages.0, &mut storages.1, &mut storages.2);
            hierarchy.remove(*entity);
    }

    for entity in entities {
        all_storages.delete(entity);
    }
}

pub struct CubeSpawner {
    //in seconds
    pub countdown:f64,
    pub next_level_up: usize,
    pub cube_speed: f64,
    pub countdown_amount: f64,
}

impl CubeSpawner {
    pub fn new() -> Self {
        Self { 
            countdown: 0.0 ,
            countdown_amount: 2.5 ,
            next_level_up: 5,
            cube_speed: 0.4 
        }
    }

    pub fn reset(&mut self) {
        self.countdown = self.countdown_amount;
        self.next_level_up -= 1;
        if self.next_level_up == 0 {
           self.next_level_up = 5;
           if self.cube_speed < 5.0 { 
            self.cube_speed += 0.2; 
           }
           if self.countdown_amount > 0.5 {
            self.countdown_amount -= 0.2;
           }
        }

    }
}

pub fn cube_spawner_countdown_sys(
    tick: UniqueView<TickUpdate>, 
    mut spawner: UniqueViewMut<CubeSpawner>, 
) {
    (*spawner).countdown -= (tick.delta / 1000.0);

}

pub fn cube_spawner_spawn_sys<'a>(
    mut sefaria_ref: UniqueViewMut<SefariaRef>,
    mut entities: EntitiesViewMut<'a>,
    textures: UniqueView<'a, GameTextures>,
    mut spawner: UniqueViewMut<'a, CubeSpawner>, 
    mut cubes: ViewMut<'a, RenderableCube>,
    mut game_cubes: ViewMut<'a, GameCube>,
    mut motions: ViewMut<'a, Motion>,
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
    if spawner.countdown < 0.0 {

        if let Some(letter) = sefaria_ref.get_letter() {
            spawner.reset();

            //spawn a cube!
            let pos = thread_rng().gen_range(CUBE_X_MIN, CUBE_X_MAX);
            let origin = Vector3::new(pos, ORIGIN_Y, ORIGIN_Z);
            let dest = Vector3::new(pos, DESTINATION_Y, DESTINATION_Z);
            let axis = Unit::new_normalize(Vector3::new(1.0, 0.0, 0.0));
            let rot = UnitQuaternion::from_axis_angle(&axis, ROTATION_X.to_radians());

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

            let mut translations = transform_storages.0;
            let mut rotations = transform_storages.1;
            entities.add_component(
                (&mut cubes, &mut translations, &mut rotations, &mut motions, &mut game_cubes), 
                (
                    RenderableCube { 
                        //TODO - texture indices
                        texture: textures.letters[letter].clone(),
                        width: CUBE_SIZE as f32, 
                        height: CUBE_SIZE as f32,
                        depth: CUBE_SIZE as f32, 
                    },
                    sg::Translation(origin),
                    sg::Rotation(rot),
                    Motion::new(origin, dest, spawner.cube_speed),
                    GameCube {letter}
                ),
                entity
            );

        }
    }
}
