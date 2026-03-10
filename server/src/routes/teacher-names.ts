import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

/**
 * GET /api/v1/teacher-names
 * 获取当前设备的教师姓名历史记录
 * Query 参数：deviceId (string) - 设备ID
 */
router.get('/', async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: '设备ID不能为空' });
    }

    const supabase = getSupabaseClient();

    // 获取历史记录，按更新时间倒序排列
    const { data, error } = await supabase
      .from('teacher_names_history')
      .select('*')
      .eq('device_id', deviceId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('获取教师姓名历史失败:', error);
      return res.status(500).json({ error: '获取历史记录失败' });
    }

    res.json({
      data: {
        teacherNames: data.map((item: any) => ({
          id: item.id,
          teacherName: item.teacher_name,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })),
      },
    });
  } catch (error) {
    console.error('获取教师姓名历史失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * POST /api/v1/teacher-names
 * 添加或更新教师姓名历史记录
 * Body 参数：
 *   - teacherName (string) - 教师姓名
 *   - deviceId (string) - 设备ID
 */
router.post('/', async (req, res) => {
  try {
    const { teacherName, deviceId } = req.body;

    if (!teacherName || !deviceId) {
      return res.status(400).json({ error: '教师姓名和设备ID不能为空' });
    }

    if (teacherName.trim().length === 0) {
      return res.status(400).json({ error: '教师姓名不能为空' });
    }

    const supabase = getSupabaseClient();

    // 使用UPSERT：如果已存在则更新时间，不存在则插入
    const { data, error } = await supabase
      .from('teacher_names_history')
      .upsert(
        {
          teacher_name: teacherName.trim(),
          device_id: deviceId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'device_id,teacher_name',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('保存教师姓名失败:', error);
      return res.status(500).json({ error: '保存失败' });
    }

    res.json({
      data: {
        id: data.id,
        teacherName: data.teacher_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error('保存教师姓名失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * DELETE /api/v1/teacher-names/:id
 * 删除指定的教师姓名记录
 * Path 参数：id (number) - 记录ID
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: '无效的记录ID' });
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('teacher_names_history')
      .delete()
      .eq('id', Number(id));

    if (error) {
      console.error('删除教师姓名失败:', error);
      return res.status(500).json({ error: '删除失败' });
    }

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('删除教师姓名失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
