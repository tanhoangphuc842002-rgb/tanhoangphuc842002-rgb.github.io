'use strict';

(() => {
    const canvas = $('photoCanvas');
    const tools = [...document.querySelectorAll('[data-photo-mark]')];
    const marks = [], undone = [];
    const ink = {black: '#000', red: '#f00', white: '#fff'};
    const hints = {
        move: 'Kéo ảnh để căn vị trí hoặc dùng các nút mũi tên.',
        brush: 'Kéo trên ảnh để vẽ.',
        erase: 'Kéo trên ảnh để tẩy vùng đã chọn.',
        text: 'Nhập chữ rồi bấm vào vị trí muốn đặt trên ảnh.',
    };
    let mode = 'move', stroke;

    function controls(editing = canvas.hasAttribute('data-editable')) {
        for (const button of tools) {
            button.disabled = !editing;
            button.setAttribute('aria-pressed', String(button.dataset.photoMark === mode));
        }
        $('photoUndo').disabled = !editing || !marks.length;
        $('photoRedo').disabled = !editing || !undone.length;
        $('photoTextLabel').hidden = mode !== 'text';
        $('photoInkControls').hidden = mode === 'move';
        $('photoInk').closest('label').hidden = mode === 'erase';
        $('photoStrokeLabel').hidden = mode === 'text';
        $('photoInk').disabled = !editing;
        $('photoStroke').disabled = !editing;
        $('photoText').disabled = !editing;
        $('photoEditHint').textContent = hints[mode];
        canvas.dataset.mark = mode;
    }

    function drawOne(context, mark, useRed) {
        const points = mark.points;
        const color = !useRed && mark.color === 'red' ? ink.black : ink[mark.color];
        const x = point => point.x * canvas.width;
        const y = point => point.y * canvas.height;
        context.fillStyle = color;
        if (mark.text) {
            context.font = 'bold 18px Arial, sans-serif';
            context.textBaseline = 'top';
            context.fillText(mark.text, x(points[0]), y(points[0]));
            return;
        }
        context.beginPath();
        if (points.length === 1) {
            context.arc(x(points[0]), y(points[0]), mark.width / 2, 0, Math.PI * 2);
            context.fill();
        } else {
            context.strokeStyle = color;
            context.lineWidth = mark.width;
            context.lineJoin = context.lineCap = 'round';
            context.moveTo(x(points[0]), y(points[0]));
            for (const point of points.slice(1)) context.lineTo(x(point), y(point));
            context.stroke();
        }
    }

    function draw(context, useRed) {
        if (!marks.length && !stroke) return;
        context.save();
        for (const mark of marks) drawOne(context, mark, useRed);
        if (stroke) drawOne(context, stroke, useRed);
        context.restore();
        // Smooth stroke edges visually match the exact pixels that will be sent.
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        image.data.set(photoProcessor.process(image.data, canvas.width, canvas.height, {}, false, false));
        context.putImageData(image, 0, 0);
    }

    function commit(mark) {
        marks.push(mark);
        undone.length = 0;
        controls();
        schedulePhotoRender();
    }

    window.photoMarks = {
        controls,
        draw,
        reset() {
            marks.length = undone.length = 0;
            mode = 'move';
            stroke = undefined;
            $('photoText').value = '';
            controls();
        },
        start(point) {
            if (mode === 'move') return false;
            if (mode === 'text') {
                const text = $('photoText').value.trim();
                if (text) commit({text, color: $('photoInk').value, points: [point]});
                else $('photoText').focus();
            } else {
                stroke = {color: mode === 'erase' ? 'white' : $('photoInk').value,
                    width: Number($('photoStroke').value), points: [point]};
                schedulePhotoRender();
            }
            return true;
        },
        move(point) { stroke?.points.push(point); },
        end() {
            if (!stroke) return;
            commit(stroke);
            stroke = undefined;
        },
    };

    for (const button of tools) button.onclick = () => {
        mode = button.dataset.photoMark;
        controls();
        if (mode === 'text') $('photoText').focus();
    };
    $('photoUndo').onclick = () => {
        undone.push(marks.pop());
        controls();
        flushPhotoRender();
    };
    $('photoRedo').onclick = () => {
        marks.push(undone.pop());
        controls();
        flushPhotoRender();
    };
    controls();
})();
