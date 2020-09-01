
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
    gameobjects::cubes::*,
    audio::AudioClip,
};
use rand::prelude::*;
use shipyard_scenegraph::{self as sg, *};


pub fn collision_sys(
    entities: EntitiesViewMut,
    cubes: View<RenderableCube>, 
    game_cubes: View<GameCube>, 
    blaster_cubes: View<BlasterCube>, 
    mut delete_cubes: ViewMut<DeleteCube>, 
    mut audio_clips: ViewMut<AudioClip>, 
    translations: View<sg::Translation>,
) {
    (&blaster_cubes, &translations).iter().with_id().for_each(|(blaster_id, (blaster, blaster_pos))| {
        let blaster_bounds = CubeBounds::new_blaster(&blaster_pos.0);
        (&game_cubes, &translations).iter().with_id().for_each(|(target_id, (target, target_pos))| {

            let target_bounds = CubeBounds::new_target(&target_pos.0);
           
            if blaster_bounds.intersects(&target_bounds) {
                entities.add_component(&mut delete_cubes, DeleteCube {}, blaster_id);
                entities.add_component(&mut delete_cubes, DeleteCube {}, target_id);
                entities.add_component(&mut audio_clips, AudioClip::new_letter(target.letter), target_id);
            }

        });
    });
    
}

#[derive(Debug)]
struct CubeBounds {
    pub min_x:f64,
    pub min_y:f64,
    pub min_z:f64,
    pub max_x:f64,
    pub max_y:f64,
    pub max_z:f64,
}

impl CubeBounds {
    pub fn new_target(pos:&Vector3<f64>) -> Self {
        Self {
            min_x: pos.x - CUBE_SIZE/2.0,
            min_y: pos.y - CUBE_SIZE/2.0,
            min_z: pos.z - CUBE_SIZE/2.0,
            max_x: pos.x + CUBE_SIZE/2.0,
            max_y: pos.y + CUBE_SIZE/2.0,
            max_z: pos.z + CUBE_SIZE/2.0,
        }
    }
    pub fn new_blaster(pos:&Vector3<f64>) -> Self {
        Self {
            min_x: pos.x - (BLASTER_WIDTH as f64)/2.0,
            min_y: pos.y - (BLASTER_HEIGHT as f64)/2.0,
            min_z: pos.z - (BLASTER_DEPTH as f64)/2.0,
            max_x: pos.x + (BLASTER_WIDTH as f64)/2.0,
            max_y: pos.y + (BLASTER_HEIGHT as f64)/2.0,
            max_z: pos.z + (BLASTER_DEPTH as f64)/2.0,
        }
    }
    pub fn intersects(&self, other:&Self) -> bool {
      return (self.min_x <= other.max_x && self.max_x >= other.min_x) &&
             (self.min_y <= other.max_y && self.max_y >= other.min_y) &&
             (self.min_z <= other.max_z && self.max_y >= other.min_z);
    }
}
