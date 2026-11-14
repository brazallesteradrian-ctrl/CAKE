import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);

async function inspect(filename) {
    const document = await io.read(filename);
    const root = document.getRoot();
    
    console.log(`\n--- Structure of ${filename} ---`);
    console.log(`Materials: ${root.listMaterials().length}`);
    console.log(`Meshes: ${root.listMeshes().length}`);
    console.log(`Nodes: ${root.listNodes().length}`);
    console.log(`Animations: ${root.listAnimations().length}`);
    
    console.log("\nNodes:");
    root.listNodes().forEach(node => {
        console.log(`- ${node.getName() || 'unnamed'} (Children: ${node.listChildren().length}, Mesh: ${node.getMesh() ? node.getMesh().getName() || 'yes' : 'no'})`);
    });
}

async function main() {
    await inspect('necklace.glb');
    await inspect('necklace2.glb');
}

main().catch(console.error);
