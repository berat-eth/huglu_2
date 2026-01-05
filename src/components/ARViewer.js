import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { getApiUrl } from '../config/api.config';

const { width, height } = Dimensions.get('window');

export default function ARViewer({ modelUrl, modelFormat, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const modelRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const onGLContextCreate = async (gl) => {
    try {
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 5;
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);
      renderer.setClearColor(0xf0f0f0);
      rendererRef.current = renderer;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);

      // Load 3D model
      if (modelUrl && modelFormat) {
        await loadModel(scene, modelUrl, modelFormat);
      } else {
        // Placeholder cube if no model
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00a8ff });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        modelRef.current = cube;
      }

      setLoading(false);

      // Animation loop
      const animate = () => {
        if (modelRef.current) {
          modelRef.current.rotation.y += 0.01;
        }
        renderer.render(scene, camera);
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch (err) {
      console.error('AR Viewer initialization error:', err);
      setError('3D model yüklenirken hata oluştu');
      setLoading(false);
    }
  };

  const loadModel = async (scene, url, format) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `${getApiUrl().replace('/api', '')}${url}`;
      
      let loader;
      let model;

      switch (format.toLowerCase()) {
        case 'obj':
          // OBJ loader için three/examples/jsm/loaders/OBJLoader kullanılabilir
          // Şimdilik basit bir placeholder gösterelim
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshStandardMaterial({ color: 0x00a8ff });
          model = new THREE.Mesh(geometry, material);
          break;
        case 'glb':
        case 'gltf':
          // GLTFLoader için three/examples/jsm/loaders/GLTFLoader kullanılabilir
          // Şimdilik basit bir placeholder gösterelim
          const gltfGeometry = new THREE.BoxGeometry(1, 1, 1);
          const gltfMaterial = new THREE.MeshStandardMaterial({ color: 0x00a8ff });
          model = new THREE.Mesh(gltfGeometry, gltfMaterial);
          break;
        default:
          // Default placeholder
          const defaultGeometry = new THREE.BoxGeometry(1, 1, 1);
          const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0x00a8ff });
          model = new THREE.Mesh(defaultGeometry, defaultMaterial);
      }

      model.position.set(0, 0, 0);
      scene.add(model);
      modelRef.current = model;
    } catch (err) {
      console.error('Model loading error:', err);
      throw err;
    }
  };

  const handleReset = () => {
    setRotation({ x: 0, y: 0 });
    setScale(1);
    if (modelRef.current) {
      modelRef.current.rotation.x = 0;
      modelRef.current.rotation.y = 0;
      modelRef.current.scale.set(1, 1, 1);
    }
  };

  const handleRotate = () => {
    if (modelRef.current) {
      modelRef.current.rotation.y += Math.PI / 4;
    }
  };

  const handleScale = (delta) => {
    const newScale = Math.max(0.5, Math.min(2, scale + delta));
    setScale(newScale);
    if (modelRef.current) {
      modelRef.current.scale.set(newScale, newScale, newScale);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00a8ff" />
          <Text style={styles.loadingText}>3D Model Yükleniyor...</Text>
        </View>
      )}
      <GLView
        style={styles.glView}
        onContextCreate={onGLContextCreate}
      />
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
          <Text style={styles.controlButtonText}>Sıfırla</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleRotate}>
          <Text style={styles.controlButtonText}>Döndür</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={() => handleScale(0.1)}>
          <Text style={styles.controlButtonText}>Büyüt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={() => handleScale(-0.1)}>
          <Text style={styles.controlButtonText}>Küçült</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={onClose}>
          <Text style={styles.controlButtonText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  glView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 10,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#00a8ff',
    borderRadius: 6,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#00a8ff',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

