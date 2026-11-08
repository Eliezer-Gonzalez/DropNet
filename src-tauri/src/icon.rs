#[cfg(windows)]
pub fn executable_icon(path: &str) -> Option<String> {
    use base64::Engine;
    use std::{mem, ptr};
    use windows_sys::Win32::{
        Graphics::Gdi::{
            CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject, GetDC, ReleaseDC,
            SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        },
        UI::{
            Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_SMALLICON},
            WindowsAndMessaging::{DestroyIcon, DrawIconEx, DI_NORMAL},
        },
    };

    const ICON_SIZE: usize = 32;
    let wide_path = path.encode_utf16().chain(Some(0)).collect::<Vec<_>>();

    unsafe {
        let mut file_info: SHFILEINFOW = mem::zeroed();
        let result = SHGetFileInfoW(
            wide_path.as_ptr(),
            0,
            &mut file_info,
            mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_SMALLICON,
        );
        if result == 0 || file_info.hIcon.is_null() {
            return None;
        }

        let icon = file_info.hIcon;
        let screen_dc = GetDC(ptr::null_mut());
        if screen_dc.is_null() {
            DestroyIcon(icon);
            return None;
        }
        let memory_dc = CreateCompatibleDC(screen_dc);
        ReleaseDC(ptr::null_mut(), screen_dc);
        if memory_dc.is_null() {
            DestroyIcon(icon);
            return None;
        }

        let mut bitmap_info: BITMAPINFO = mem::zeroed();
        bitmap_info.bmiHeader = BITMAPINFOHEADER {
            biSize: mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: ICON_SIZE as i32,
            biHeight: -(ICON_SIZE as i32),
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB,
            biSizeImage: (ICON_SIZE * ICON_SIZE * 4) as u32,
            biXPelsPerMeter: 0,
            biYPelsPerMeter: 0,
            biClrUsed: 0,
            biClrImportant: 0,
        };
        let mut pixels = ptr::null_mut();
        let bitmap = CreateDIBSection(
            memory_dc,
            &bitmap_info,
            DIB_RGB_COLORS,
            &mut pixels,
            ptr::null_mut(),
            0,
        );
        if bitmap.is_null() || pixels.is_null() {
            if !bitmap.is_null() {
                DeleteObject(bitmap as _);
            }
            DeleteDC(memory_dc);
            DestroyIcon(icon);
            return None;
        }

        let previous = SelectObject(memory_dc, bitmap as _);
        let drawn = DrawIconEx(
            memory_dc,
            0,
            0,
            icon,
            ICON_SIZE as i32,
            ICON_SIZE as i32,
            0,
            ptr::null_mut(),
            DI_NORMAL,
        ) != 0;
        let mut rgba = Vec::with_capacity(ICON_SIZE * ICON_SIZE * 4);
        if drawn {
            let bgra = std::slice::from_raw_parts(pixels.cast::<u8>(), ICON_SIZE * ICON_SIZE * 4);
            let has_alpha = bgra.chunks_exact(4).any(|pixel| pixel[3] != 0);
            for pixel in bgra.chunks_exact(4) {
                let alpha = if has_alpha { pixel[3] } else { 255 };
                let unpremultiply = |channel: u8| {
                    if alpha == 0 { 0 } else { ((channel as u16 * 255 / alpha as u16).min(255)) as u8 }
                };
                rgba.extend_from_slice(&[
                    unpremultiply(pixel[2]),
                    unpremultiply(pixel[1]),
                    unpremultiply(pixel[0]),
                    alpha,
                ]);
            }
        }

        SelectObject(memory_dc, previous);
        DeleteObject(bitmap as _);
        DeleteDC(memory_dc);
        DestroyIcon(icon);
        if !drawn {
            return None;
        }

        let mut png_data = Vec::new();
        let mut encoder = png::Encoder::new(&mut png_data, ICON_SIZE as u32, ICON_SIZE as u32);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        encoder.write_header().ok()?.write_image_data(&rgba).ok()?;
        Some(base64::engine::general_purpose::STANDARD.encode(png_data))
    }
}

#[cfg(not(windows))]
pub fn executable_icon(_path: &str) -> Option<String> {
    None
}
