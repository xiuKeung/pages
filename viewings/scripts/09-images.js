/* 模块 29：由原 index.html 内联脚本迁移。 */
(() => {
    const form = document.getElementById('recordForm');
    const editor = document.getElementById('editor');
    const recordsNode = document.getElementById('records');
    const prosLabel = document.getElementById('pros')?.closest('label');
    if (!form || !editor || !recordsNode || !prosLabel || document.getElementById('imageRefs')) return;

    const databaseName = 'shenzhen-viewing-images-v1';
    const storeName = 'images';
    const openDatabase = () => new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const nativeImages = window.NativeStore.isNative();
    const database = nativeImages ? null : openDatabase();
    const run = async (mode, action) => new Promise(async (resolve, reject) => {
      try {
        const db = await database;
        const transaction = db.transaction(storeName, mode);
        const request = action(transaction.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) { reject(error); }
    });
    const putImage = (recordId, id, blob) => nativeImages
      ? window.NativeStore.storeViewingImage(recordId, id, blob)
      : run('readwrite', store => store.put(blob, id));
    const getImage = ref => nativeImages
      ? window.NativeStore.getViewingImage(ref, true)
      : run('readonly', store => store.get(ref.id));
    const getFullImage = ref => nativeImages
      ? window.NativeStore.getViewingImage(ref, false)
      : run('readonly', store => store.get(ref.id));
    const deleteImage = ref => nativeImages
      ? window.NativeStore.deleteViewingImage(ref)
      : run('readwrite', store => store.delete(ref.id));
    const parseRefs = value => {
      try {
        const refs = JSON.parse(value || '[]');
        return Array.isArray(refs) ? refs : [];
      } catch (_) { return []; }
    };
    const createId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

    const imageSection = document.createElement('div');
    imageSection.className = 'wide';
    const field = document.createElement('label');
    field.textContent = '房源图片（可多选）';
    const picker = document.createElement('input');
    picker.id = 'imagePicker';
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.multiple = true;
    picker.hidden = true;
    const camera = document.createElement('input');
    camera.id = 'imageCamera';
    camera.type = 'file';
    camera.accept = 'image/*';
    camera.setAttribute('capture', 'environment');
    camera.hidden = true;
    const chooseImages = document.createElement('button');
    chooseImages.type = 'button';
    chooseImages.textContent = '选择图片';
    chooseImages.addEventListener('click', () => picker.click());
    const takePhoto = document.createElement('button');
    takePhoto.type = 'button';
    takePhoto.textContent = '拍照';
    takePhoto.addEventListener('click', () => camera.click());
    const refsInput = document.createElement('input');
    refsInput.id = 'imageRefs';
    refsInput.name = 'imageRefs';
    refsInput.type = 'hidden';
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    const imageActions = document.createElement('div');
    imageActions.className = 'image-actions';
    imageActions.append(chooseImages, takePhoto);
    field.append(picker, camera, refsInput);
    imageSection.append(field, imageActions, preview);
    prosLabel.before(imageSection);

    const lightbox = document.createElement('div');
    lightbox.className = 'image-lightbox';
    lightbox.hidden = true;
    const viewport = document.createElement('div');
    viewport.className = 'image-lightbox-viewport';
    const lightboxImage = document.createElement('img');
    const closeLightbox = document.createElement('button');
    closeLightbox.className = 'lightbox-close';
    closeLightbox.type = 'button';
    closeLightbox.textContent = '×';
    closeLightbox.setAttribute('aria-label', '关闭大图预览');
    const lightboxActions = document.createElement('div');
    lightboxActions.className = 'lightbox-actions';
    const saveCurrent = document.createElement('button');
    saveCurrent.type = 'button';
    saveCurrent.textContent = '保存当前图片';
    const saveAll = document.createElement('button');
    saveAll.type = 'button';
    saveAll.textContent = '保存本记录全部图片';
    lightboxActions.append(saveCurrent, saveAll);
    const lightboxMessage = document.createElement('p');
    lightboxMessage.className = 'lightbox-message';
    viewport.append(lightboxImage);
    lightbox.append(viewport, closeLightbox, lightboxMessage, lightboxActions);
    document.body.append(lightbox);
    let lightboxUrl = '', lightboxBlob = null, lightboxRef = null, lightboxRefs = [], scale = 1, offsetX = 0, offsetY = 0;
    const renderTransform = () => { lightboxImage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`; };
    const resetTransform = () => { scale = 1; offsetX = 0; offsetY = 0; renderTransform(); };
    const showLightboxMessage = message => {
      lightboxMessage.textContent = message;
      clearTimeout(showLightboxMessage.timer);
      showLightboxMessage.timer = setTimeout(() => { lightboxMessage.textContent = ''; }, 3000);
    };
    const hideLightbox = () => {
      lightbox.hidden = true;
      if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
      lightboxUrl = ''; lightboxBlob = null; lightboxRef = null; lightboxRefs = []; lightboxMessage.textContent = '';
      lightboxImage.removeAttribute('src');
      resetTransform();
    };
    const showLightbox = (blob, name, ref, allRefs = []) => {
      hideLightbox();
      lightboxUrl = URL.createObjectURL(blob);
      lightboxImage.src = lightboxUrl;
      lightboxImage.alt = name || '房源图片';
      lightboxBlob = blob; lightboxRef = ref; lightboxRefs = allRefs;
      saveAll.disabled = allRefs.length < 2;
      lightbox.hidden = false;
    };
    const safeName = (name, index = 0) => {
      const extension = /\.[a-z0-9]{2,5}$/i.test(name || '') ? '' : '.jpg';
      return String(name || `房源图片-${index + 1}`).replace(/[\\/:*?"<>|]/g, '_') + extension;
    };
    const saveImages = async images => {
      try {
        if (nativeImages && await window.NativeStore.saveViewingImagesToDevice(images)) {
          showLightboxMessage(images.length === 1 ? '图片已保存到系统相册。' : `${images.length} 张图片已保存到系统相册。`);
          return;
        }
        images.forEach((item, index) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(item.blob); link.download = safeName(item.name, index);
          document.body.append(link); link.click();
          setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
        });
        showLightboxMessage(images.length === 1 ? '图片下载已开始。' : '图片下载已开始。');
      } catch (error) {
        showLightboxMessage(`保存图片失败：${error.message || '请重试'}`);
      }
    };
    saveCurrent.addEventListener('click', () => lightboxBlob && saveImages([{ blob: lightboxBlob, name: lightboxRef?.name || lightboxImage.alt, type: lightboxRef?.type || lightboxBlob.type }]));
    saveAll.addEventListener('click', async () => {
      saveAll.disabled = true;
      try {
        const images = [];
        for (const ref of lightboxRefs) {
          const blob = await getFullImage(ref);
          if (blob) images.push({ blob, name: ref.name, type: ref.type || blob.type });
        }
        if (images.length) await saveImages(images);
      } finally { saveAll.disabled = lightboxRefs.length < 2; }
    });
    closeLightbox.addEventListener('click', hideLightbox);
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) hideLightbox();
    });

    const pointers = new Map();
    let pinchDistance = 0, pinchScale = 1, dragStart = null;
    const distance = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    viewport.addEventListener('pointerdown', event => {
      pointers.set(event.pointerId, { x:event.clientX, y:event.clientY });
      viewport.setPointerCapture?.(event.pointerId);
      if (pointers.size === 2) { pinchDistance = distance(); pinchScale = scale; dragStart = null; }
      else dragStart = { x:event.clientX, y:event.clientY, offsetX, offsetY };
    });
    viewport.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x:event.clientX, y:event.clientY });
      if (pointers.size === 2 && pinchDistance) scale = Math.min(4, Math.max(1, pinchScale * distance() / pinchDistance));
      else if (dragStart && scale > 1) { offsetX = dragStart.offsetX + event.clientX - dragStart.x; offsetY = dragStart.offsetY + event.clientY - dragStart.y; }
      renderTransform();
    });
    const releasePointer = event => { pointers.delete(event.pointerId); if (pointers.size < 2) pinchDistance = 0; if (!pointers.size) dragStart = null; };
    viewport.addEventListener('pointerup', releasePointer); viewport.addEventListener('pointercancel', releasePointer);
    viewport.addEventListener('wheel', event => { event.preventDefault(); scale = Math.min(4, Math.max(1, scale + (event.deltaY < 0 ? .2 : -.2))); renderTransform(); }, { passive:false });

    let refs = [];
    const sync = () => {
      refsInput.value = JSON.stringify(refs);
      form.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const thumbnail = async (ref, removable, target, allRefs = []) => {
      const blob = await getImage(ref);
      if (!blob) return;
      const item = document.createElement('div');
      item.className = 'image-item';
      const image = document.createElement('img');
      const url = URL.createObjectURL(blob);
      image.src = url;
      image.alt = ref.name || '房源图片';
      image.onload = () => URL.revokeObjectURL(url);
      image.addEventListener('click', async () => {
        showLightbox(await getFullImage(ref) || blob, ref.name, ref, allRefs);
      });
      item.append(image);
      if (removable) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.title = '删除图片';
        remove.addEventListener('click', async () => {
          if (!confirm(`确认删除图片“${ref.name || '未命名图片'}”吗？`)) return;
          refs = refs.filter(item => item.id !== ref.id);
          await deleteImage(ref);
          sync();
          renderEditor();
        });
        item.append(remove);
      }
      target.append(item);
    };
    const renderEditor = async () => {
      preview.replaceChildren();
      for (const ref of refs) await thumbnail(ref, true, preview, refs);
    };
    const setRefs = async value => {
      refs = parseRefs(value);
      refsInput.value = JSON.stringify(refs);
      await renderEditor();
    };
    const addFiles = async input => {
      const files = [...input.files || []].filter(file => file.type.startsWith('image/'));
      let recordId = document.getElementById('recordId')?.value;
      if (nativeImages && !recordId) {
        recordId = createId();
        document.getElementById('recordId').value = recordId;
      }
      for (const file of files) {
        const id = createId();
        const stored = await putImage(recordId, id, file);
        refs.push(nativeImages ? stored : { id, name: file.name, type: file.type, createdAt: Date.now() });
      }
      input.value = '';
      sync();
      await renderEditor();
    };
    picker.addEventListener('change', () => addFiles(picker));
    camera.addEventListener('change', () => addFiles(camera));
    new MutationObserver(() => {
      if (editor.classList.contains('hidden')) return;
      const id = document.getElementById('recordId')?.value;
      const record = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]')
        .find(item => String(item.id) === String(id));
      setRefs(record?.imageRefs);
    }).observe(editor, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', event => {
      if (event.target.closest('#add')) {
        setTimeout(() => { refs = []; refsInput.value = '[]'; preview.replaceChildren(); }, 0);
      }
    }, true);

    const renderRecordImages = async () => {
      const records = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]');
      for (const card of recordsNode.querySelectorAll('.record')) {
        const id = card.querySelector('[data-edit]')?.dataset.edit;
        const record = records.find(item => String(item.id) === String(id));
        const imageRefs = parseRefs(record?.imageRefs);
        let details = card.querySelector('.record-images');
        if (!imageRefs.length) {
          details?.remove();
          continue;
        }
        if (details?.dataset.imageIds === JSON.stringify(imageRefs.map(item => item.id))) continue;
        if (!details) {
          details = document.createElement('details');
          details.className = 'record-extra record-images';
          card.querySelector('.record-actions')?.before(details);
        }
        details.dataset.imageIds = JSON.stringify(imageRefs.map(item => item.id));
        const summary = document.createElement('summary');
        summary.textContent = '房源图片（' + imageRefs.length + ' 张）';
        const list = document.createElement('div');
        list.className = 'image-preview';
        details.replaceChildren(summary, list);
        for (const ref of imageRefs) await thumbnail(ref, false, list, imageRefs);
      }
    };
    new MutationObserver(renderRecordImages).observe(recordsNode, { childList: true });
    renderRecordImages();
  })();
