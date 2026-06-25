-- Migración v2: campos extendidos de adoptantes y reconocimientos positivos
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL)

-- 1. Nuevas columnas en adoptantes
ALTER TABLE adoptantes
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS terreno_cercado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_propietario boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS condicion_vivienda text CHECK (condicion_vivienda IN ('propietario', 'inquilino', 'familiar', 'otro')),
  ADD COLUMN IF NOT EXISTS buen_adoptante boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observaciones text;

-- 2. Permitir gravedad 'positivo' para reconocimientos de buen adoptante
ALTER TABLE historial_incidentes DROP CONSTRAINT IF EXISTS historial_incidentes_gravedad_check;
ALTER TABLE historial_incidentes
  ADD CONSTRAINT historial_incidentes_gravedad_check
  CHECK (gravedad IN ('leve', 'moderado', 'grave', 'positivo'));

-- 3. Actualizar RPC de búsqueda (reemplaza la función existente)
CREATE OR REPLACE FUNCTION buscar_adoptante_universal(search_term text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO result
  FROM (
    SELECT
      a.id,
      a.nombre,
      a.apellido,
      a.dni,
      a.telefono,
      a.direccion,
      a.email,
      a.terreno_cercado,
      a.es_propietario,
      a.condicion_vivienda,
      a.buen_adoptante,
      a.observaciones,
      a.updated_at AS ultima_modificacion,
      COALESCE(p_creador.nombre_completo, 'Desconocido') AS creado_por,
      p_mod.nombre_completo AS modificado_por,
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'incidente_id', hi.id,
            'titulo', hi.titulo,
            'descripcion', hi.descripcion,
            'gravedad', hi.gravedad,
            'fecha', hi.created_at,
            'cargado_por', COALESCE(p_inc.nombre_completo, 'Sistema'),
            'archivos', (
              SELECT COALESCE(json_agg(
                json_build_object('nombre', ar.nombre_archivo, 'url', ar.url_storage)
              ), '[]'::json)
              FROM archivos ar WHERE ar.incidente_id = hi.id
            )
          ) ORDER BY hi.created_at DESC
        ), '[]'::json)
        FROM historial_incidentes hi
        LEFT JOIN profiles p_inc ON p_inc.id = hi.creado_por
        WHERE hi.adoptante_id = a.id
      ) AS historial
    FROM adoptantes a
    LEFT JOIN profiles p_creador ON p_creador.id = a.creado_por
    LEFT JOIN profiles p_mod ON p_mod.id = a.modificado_por
    WHERE
      search_term IS NULL OR search_term = '' OR
      a.nombre ILIKE '%' || search_term || '%' OR
      a.apellido ILIKE '%' || search_term || '%' OR
      a.dni ILIKE '%' || search_term || '%' OR
      a.telefono ILIKE '%' || search_term || '%' OR
      a.direccion ILIKE '%' || search_term || '%' OR
      a.email ILIKE '%' || search_term || '%' OR
      a.observaciones ILIKE '%' || search_term || '%'
    ORDER BY a.apellido NULLS LAST, a.nombre NULLS LAST
  ) t;

  RETURN result;
END;
$$;

-- 4. RPC para listar adoptantes con paginación
CREATE OR REPLACE FUNCTION listar_adoptantes(p_limit int DEFAULT 50, p_offset int DEFAULT 0, p_filtro text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total_count bigint;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM adoptantes a
  WHERE p_filtro IS NULL OR p_filtro = '' OR
    a.nombre ILIKE '%' || p_filtro || '%' OR
    a.apellido ILIKE '%' || p_filtro || '%' OR
    a.dni ILIKE '%' || p_filtro || '%' OR
    a.telefono ILIKE '%' || p_filtro || '%' OR
    a.direccion ILIKE '%' || p_filtro || '%';

  SELECT json_build_object(
    'total', total_count,
    'adoptantes', COALESCE((
      SELECT json_agg(row_to_json(s))
      FROM (
        SELECT
          a.id,
          a.nombre,
          a.apellido,
          a.dni,
          a.telefono,
          a.direccion,
          a.email,
          a.terreno_cercado,
          a.es_propietario,
          a.condicion_vivienda,
          a.buen_adoptante,
          a.observaciones,
          a.created_at,
          (SELECT COUNT(*) FROM historial_incidentes hi WHERE hi.adoptante_id = a.id AND hi.gravedad != 'positivo') AS total_alertas,
          (SELECT COUNT(*) FROM historial_incidentes hi WHERE hi.adoptante_id = a.id AND hi.gravedad = 'positivo') AS total_reconocimientos
        FROM adoptantes a
        WHERE p_filtro IS NULL OR p_filtro = '' OR
          a.nombre ILIKE '%' || p_filtro || '%' OR
          a.apellido ILIKE '%' || p_filtro || '%' OR
          a.dni ILIKE '%' || p_filtro || '%' OR
          a.telefono ILIKE '%' || p_filtro || '%' OR
          a.direccion ILIKE '%' || p_filtro || '%'
        ORDER BY a.apellido NULLS LAST, a.nombre NULLS LAST
        LIMIT p_limit OFFSET p_offset
      ) s
    ), '[]'::json)
  )
  INTO result;

  RETURN result;
END;
$$;
