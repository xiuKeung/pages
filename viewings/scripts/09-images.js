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
    const imageSizes = new Map();
    const formatBytes = value => {
      const size = Number(value || 0);
      if (!size) return '大小未知';
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 100 * 1024 ? 0 : 1)} KB`;
      return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
    };
    const getImageSize = async (ref, loadedBlob = null) => {
      if (imageSizes.has(ref.id)) return imageSizes.get(ref.id);
      let size = Number(ref.size || 0);
      if (!size && nativeImages) size = await window.NativeStore.getViewingImageSize(ref);
      if (!size) size = Number(loadedBlob?.size || (await getFullImage(ref))?.size || 0);
      imageSizes.set(ref.id, size);
      return size;
    };
    const totalImageSize = async items => (await Promise.all(items.map(ref => getImageSize(ref)))).reduce((sum, size) => sum + size, 0);
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
    const imageTitle = document.createElement('span');
    imageTitle.textContent = '房源图片（可多选）';
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
    const takePhoto = document.createElement('button');
    takePhoto.type = 'button';
    takePhoto.textContent = '拍照';
    const refsInput = document.createElement('input');
    refsInput.id = 'imageRefs';
    refsInput.name = 'imageRefs';
    refsInput.type = 'hidden';
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    const imageActions = document.createElement('div');
    imageActions.className = 'image-actions';
    imageActions.append(chooseImages, takePhoto);
    field.append(imageTitle, picker, camera, refsInput);
    imageSection.append(field, imageActions, preview);
    prosLabel.before(imageSection);

    let waitingForImagePicker = false;
    let pickerFocusTimer;
    const beginImagePicker = input => {
      waitingForImagePicker = true;
      clearTimeout(pickerFocusTimer);
      window.dispatchEvent(new Event('viewing:image-picker-open'));
      input.click();
    };
    const settleImagePicker = () => {
      waitingForImagePicker = false;
      clearTimeout(pickerFocusTimer);
      window.dispatchEvent(new Event('viewing:image-picker-settled'));
    };
    chooseImages.addEventListener('click', () => beginImagePicker(picker));
    takePhoto.addEventListener('click', () => beginImagePicker(camera));
    // 取消系统相机时不一定触发 change；回到页面获得焦点后延迟解除标记，
    // 避免下次正常切后台被长期误判为图片选择中。
    window.addEventListener('focus', () => {
      if (!waitingForImagePicker) return;
      clearTimeout(pickerFocusTimer);
      pickerFocusTimer = setTimeout(() => {
        if (waitingForImagePicker) settleImagePicker();
      }, 500);
    });

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
    const previousImage = document.createElement('button');
    previousImage.className = 'lightbox-nav lightbox-previous';
    previousImage.type = 'button';
    previousImage.textContent = '‹';
    previousImage.setAttribute('aria-label', '上一张图片');
    const nextImage = document.createElement('button');
    nextImage.className = 'lightbox-nav lightbox-next';
    nextImage.type = 'button';
    nextImage.textContent = '›';
    nextImage.setAttribute('aria-label', '下一张图片');
    const imageCounter = document.createElement('p');
    imageCounter.className = 'lightbox-counter';
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
    const lightboxLoading = document.createElement('span');
    lightboxLoading.className = 'lightbox-loading';
    lightboxLoading.textContent = '正在加载高清图片';
    viewport.append(lightboxImage);
    lightbox.append(viewport, closeLightbox, previousImage, nextImage, imageCounter, lightboxLoading, lightboxMessage, lightboxActions);
    document.body.append(lightbox);
    let lightboxUrl = '', lightboxBlob = null, lightboxRef = null, lightboxRefs = [], lightboxIsFull = false, lightboxLoadToken = 0, scale = 1, offsetX = 0, offsetY = 0;
    const fullImageCache = new Map();
    const maxCachedFullImages = 4;
    const renderTransform = () => { lightboxImage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`; };
    const resetTransform = () => { scale = 1; offsetX = 0; offsetY = 0; renderTransform(); };
    const showLightboxMessage = message => {
      lightboxMessage.textContent = message;
      clearTimeout(showLightboxMessage.timer);
      showLightboxMessage.timer = setTimeout(() => { lightboxMessage.textContent = ''; }, 3000);
    };
    const currentImageIndex = () => lightboxRefs.findIndex(ref => String(ref.id) === String(lightboxRef?.id));
    const updateNavigation = () => {
      const index = currentImageIndex();
      const multiple = lightboxRefs.length > 1;
      previousImage.hidden = !multiple;
      nextImage.hidden = !multiple;
      previousImage.disabled = !multiple || index <= 0;
      nextImage.disabled = !multiple || index < 0 || index >= lightboxRefs.length - 1;
      imageCounter.textContent = multiple && index >= 0 ? `${index + 1} / ${lightboxRefs.length}` : '';
    };
    const cacheFullImage = async ref => {
      const key = String(ref?.id || '');
      if (!key) return null;
      if (fullImageCache.has(key)) {
        const cached = fullImageCache.get(key);
        fullImageCache.delete(key);
        fullImageCache.set(key, cached);
        return cached;
      }
      const blob = await getFullImage(ref);
      if (!blob) return null;
      fullImageCache.set(key, blob);
      while (fullImageCache.size > maxCachedFullImages) fullImageCache.delete(fullImageCache.keys().next().value);
      return blob;
    };
    const warmAdjacentFullImages = ref => {
      const index = lightboxRefs.findIndex(item => String(item.id) === String(ref?.id));
      const neighbours = [lightboxRefs[index + 1], lightboxRefs[index - 1]].filter(Boolean);
      void (async () => {
        for (const item of neighbours) await cacheFullImage(item);
      })();
    };
    const setLightboxImage = (blob, name, ref, isFull = false, shouldReset = true) => {
      if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
      lightboxUrl = URL.createObjectURL(blob);
      lightboxImage.src = lightboxUrl;
      lightboxImage.alt = name || '房源图片';
      lightboxBlob = blob;
      lightboxRef = ref;
      lightboxIsFull = isFull;
      lightbox.classList.toggle('is-loading', !isFull);
      saveCurrent.disabled = !isFull;
      if (shouldReset) resetTransform();
      updateNavigation();
    };
    const hideLightbox = () => {
      lightboxLoadToken += 1;
      lightbox.hidden = true;
      if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
      lightboxUrl = ''; lightboxBlob = null; lightboxRef = null; lightboxRefs = []; lightboxIsFull = false; fullImageCache.clear(); lightboxMessage.textContent = ''; imageCounter.textContent = '';
      lightbox.classList.remove('is-loading');
      lightboxImage.removeAttribute('src');
      resetTransform();
    };
    const loadFullImage = async (ref, previewBlob, token) => {
      try {
        const fullBlob = nativeImages ? await cacheFullImage(ref) : previewBlob;
        if (!fullBlob || token !== lightboxLoadToken || String(lightboxRef?.id) !== String(ref.id)) return;
        setLightboxImage(fullBlob, ref.name, ref, true, false);
        warmAdjacentFullImages(ref);
      } catch (_) {
        if (token === lightboxLoadToken) lightbox.classList.remove('is-loading');
      }
    };
    const showImage = async (ref, previewBlob = null) => {
      const token = ++lightboxLoadToken;
      const thumbnailBlob = previewBlob || await getImage(ref);
      if (!thumbnailBlob || token !== lightboxLoadToken) return;
      setLightboxImage(thumbnailBlob, ref.name, ref, !nativeImages);
      if (nativeImages) void loadFullImage(ref, thumbnailBlob, token);
      else warmAdjacentFullImages(ref);
    };
    const showLightbox = (blob, name, ref, allRefs = []) => {
      hideLightbox();
      lightboxRefs = allRefs;
      saveAll.disabled = allRefs.length < 2;
      lightbox.hidden = false;
      void showImage(ref, blob);
    };
    const switchImage = async direction => {
      const index = currentImageIndex();
      const target = lightboxRefs[index + direction];
      if (!target) return;
      await showImage(target);
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
    previousImage.addEventListener('click', () => switchImage(-1));
    nextImage.addEventListener('click', () => switchImage(1));
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
    const releasePointer = event => {
      const point = pointers.get(event.pointerId);
      const start = dragStart;
      const wasSinglePointer = pointers.size === 1;
      pointers.delete(event.pointerId);
      if (wasSinglePointer && start && point && scale === 1) {
        const deltaX = point.x - start.x;
        const deltaY = point.y - start.y;
        if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY)) void switchImage(deltaX < 0 ? 1 : -1);
      }
      if (pointers.size < 2) pinchDistance = 0;
      if (!pointers.size) dragStart = null;
    };
    viewport.addEventListener('pointerup', releasePointer); viewport.addEventListener('pointercancel', releasePointer);
    viewport.addEventListener('wheel', event => { event.preventDefault(); scale = Math.min(4, Math.max(1, scale + (event.deltaY < 0 ? .2 : -.2))); renderTransform(); }, { passive:false });

    let refs = [];
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const showImageImportProgress = total => {
      if (total < 2) return null;
      const dialog = document.createElement('div');
      dialog.className = 'import-progress-dialog image-import-progress';
      dialog.innerHTML = '<div class="import-progress-panel" role="status" aria-live="polite" aria-label="正在添加房源图片"><div class="import-progress-ring"><span>0%</span></div><h3>正在添加图片</h3><p class="import-progress-status">正在准备图片…</p><p class="import-progress-detail">请勿关闭页面或切换应用</p></div>';
      const ring = dialog.querySelector('.import-progress-ring');
      const percent = ring.querySelector('span');
      const status = dialog.querySelector('.import-progress-status');
      const detail = dialog.querySelector('.import-progress-detail');
      document.body.append(dialog);
      const update = (completed, text = '正在保存图片') => {
        const value = Math.round(Math.min(100, Math.max(0, completed / total * 100)));
        ring.style.setProperty('--progress', `${value * 3.6}deg`);
        percent.textContent = `${value}%`;
        status.textContent = text;
        detail.textContent = `已添加 ${completed} / ${total} 张图片`;
      };
      return {
        update,
        complete: (added, failed) => {
          ring.classList.add('is-complete');
          percent.textContent = '✓';
          status.textContent = failed ? `已添加 ${added} 张图片，${failed} 张失败` : `已添加 ${added} 张图片`;
          detail.textContent = failed ? '失败图片可重新选择添加' : '图片已保存到当前记录';
          setTimeout(() => dialog.remove(), 700);
        },
        close: () => dialog.remove()
      };
    };
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
      image.addEventListener('click', () => showLightbox(blob, ref.name, ref, allRefs));
      item.append(image);
      const caption = document.createElement('span');
      caption.className = 'image-caption';
      caption.textContent = formatBytes(await getImageSize(ref, nativeImages ? null : blob));
      item.append(caption);
      if (removable) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.title = '删除图片';
        remove.addEventListener('click', async () => {
          const confirmed = await window.AppDialog.confirm({
            title: '删除房源图片',
            message: `确认删除图片“${ref.name || '未命名图片'}”吗？`,
            confirmText: '删除图片'
          });
          if (!confirmed) return;
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
      imageTitle.textContent = refs.length ? `房源图片（${refs.length} 张 · 正在加载…）` : '房源图片（可多选）';
      for (const ref of refs) {
        await thumbnail(ref, true, preview, refs);
        // 缩略图文件读取与解码会占用 Android WebView 的主线程；逐张让出一帧，
        // 保持展开详情、滚动和返回操作可响应。
        await nextFrame();
      }
      if (refs.length) imageTitle.textContent = `房源图片（${refs.length} 张 · 共 ${formatBytes(await totalImageSize(refs))}）`;
    };
    const setRefs = async value => {
      refs = parseRefs(value);
      refsInput.value = JSON.stringify(refs);
      await renderEditor();
    };
    const addFiles = async input => {
      const files = [...input.files || []].filter(file => file.type.startsWith('image/'));
      if (!files.length) return;
      let recordId = document.getElementById('recordId')?.value;
      if (nativeImages && !recordId) {
        recordId = createId();
        document.getElementById('recordId').value = recordId;
      }
      const progress = showImageImportProgress(files.length);
      let added = 0;
      let failed = 0;
      // 先让进度层完成一次绘制；大图压缩和缩略图生成会占用主线程。
      await nextFrame();
      for (const [index, file] of files.entries()) {
        try {
          progress?.update(index, '正在保存图片');
          const id = createId();
          const stored = await putImage(recordId, id, file);
          const ref = nativeImages
            ? stored
            : { id, name: file.name, type: file.type, size: file.size, createdAt: Date.now() };
          refs.push(ref);
          // 不等待全部图片完成，每张保存后立即显示缩略图。
          await thumbnail(ref, true, preview, refs);
          added += 1;
          progress?.update(index + 1, '正在添加图片');
        } catch (error) {
          failed += 1;
          console.error('保存房源图片失败：', error);
          progress?.update(index + 1, '部分图片添加失败');
        }
        await nextFrame();
      }
      input.value = '';
      sync();
      if (refs.length) imageTitle.textContent = `房源图片（${refs.length} 张 · 共 ${formatBytes(await totalImageSize(refs))}）`;
      else imageTitle.textContent = '房源图片（可多选）';
      progress?.complete(added, failed);
    };
    const handleSelectedFiles = async input => {
      try {
        await addFiles(input);
      } catch (error) {
        console.error('添加房源图片失败：', error);
      } finally {
        settleImagePicker();
      }
    };
    picker.addEventListener('change', () => { void handleSelectedFiles(picker); });
    camera.addEventListener('change', () => { void handleSelectedFiles(camera); });
    let editorImageLoadToken = 0;
    new MutationObserver(() => {
      if (editor.classList.contains('hidden')) return;
      const id = document.getElementById('recordId')?.value;
      const record = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]')
        .find(item => String(item.id) === String(id));
      const token = ++editorImageLoadToken;
      // 连续两帧后再读取缩略图，保证编辑器先显示出来。
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token === editorImageLoadToken && !editor.classList.contains('hidden')) setRefs(record?.imageRefs);
      }));
    }).observe(editor, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', event => {
      if (event.target.closest('#add')) {
        setTimeout(() => { refs = []; refsInput.value = '[]'; preview.replaceChildren(); }, 0);
      }
    }, true);
    document.addEventListener('click', async event => {
      if (!event.target.closest('#cancel')) return;
      const recordId = document.getElementById('recordId')?.value;
      const saved = JSON.parse(window.NativeStore.viewingRecordsJson() || '[]')
        .some(record => String(record.id) === String(recordId));
      if (saved || !refs.length) return;
      const temporaryRefs = refs;
      refs = [];
      refsInput.value = '[]';
      preview.replaceChildren();
      await Promise.all(temporaryRefs.map(ref => deleteImage(ref)));
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
        summary.textContent = `房源图片（${imageRefs.length} 张 · 共 ${formatBytes(await totalImageSize(imageRefs))}）`;
        const list = document.createElement('div');
        list.className = 'image-preview';
        details.replaceChildren(summary, list);
        let loaded = false;
        details.addEventListener('toggle', async () => {
          if (!details.open || loaded) return;
          loaded = true;
          for (const ref of imageRefs) await thumbnail(ref, false, list, imageRefs);
        });
      }
    };
    new MutationObserver(renderRecordImages).observe(recordsNode, { childList: true });
    renderRecordImages();
  })();
